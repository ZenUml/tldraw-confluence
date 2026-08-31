def stable_whiteboard_release:
  (.draft == false)
  and (.prerelease == false)
  and ((.tag_name? // "") | test("^v[0-9]{4}\\.[0-9]{2}\\.[0-9]{6}-tldraw$"))
  and ((.published_at? | type) == "string");

(
  if type != "array" or any(.[]; type != "array") then
    error("Expected paginated GitHub release arrays.")
  else
    (add // [])
  end
) as $all_releases
| ($all_releases | map(select(stable_whiteboard_release))) as $stable_releases
| ($stable_releases | map(select((.id | tostring) == $current_id))) as $current_matches
| ($current_matches
   | if length == 1 then .[0]
     else error("Current Whiteboard release is not uniquely present as a stable publication.")
     end) as $current
| if $current.published_at != $current_published_at then
    error("Current Whiteboard release publication time does not match the event.")
  else
    .
  end
| ($stable_releases
   | map(select(
       .published_at == $current_published_at
       and ((.id | tostring) != $current_id)
     ))) as $same_time_releases
| if ($same_time_releases | length) != 0 then
    error("Whiteboard release publication order is ambiguous.")
  else
    .
  end
| ($stable_releases
   | map(select(.published_at > $current_published_at))) as $newer_releases
| if ($newer_releases | length) != 0 then
    error("Current Whiteboard release is not the latest stable publication.")
  else
    .
  end
| ($stable_releases
   | map(select(.published_at < $current_published_at))) as $older_releases
| ($older_releases | map(.published_at) | max) as $previous_published_at
| ($older_releases
   | map(select(.published_at == $previous_published_at))) as $previous_matches
| if $previous_published_at == null then
    {currentTag: $current.tag_name, previousTag: ""}
  elif ($previous_matches | length) != 1 then
    error("Previous Whiteboard release publication is ambiguous.")
  else
    {currentTag: $current.tag_name, previousTag: $previous_matches[0].tag_name}
  end
