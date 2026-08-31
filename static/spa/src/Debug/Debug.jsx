export default function Debug() {
  // get local storage 'tldraw-debug' value
  const debugEnabled = localStorage.getItem('tldraw-debug') === 'true';
  const host = window.location.host;
  const gitBranch = 'master';
  const contentId = 'uuid';

  // refresh page
  const refreshPage = () => {
    window.location.reload(false);
  }

  return debugEnabled && (
      <div className="flex flex-nowrap m-2 text-sm">
        <div className="text-xs inline-flex items-center font-bold leading-sm px-3 py-1 bg-blue-200 text-blue-700 rounded-full">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
               xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path>
          </svg>
          <span className="inline-block px-2">{host}</span>
        </div>
        <div className="ml-4 text-xs inline-flex items-center font-bold leading-sm px-3 py-1 bg-green-200 text-green-700 rounded-full">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="3" x2="6" y2="15"></line>
            <circle cx="18" cy="6" r="3"></circle>
            <circle cx="6" cy="18" r="3"></circle>
            <path d="M18 9a9 9 0 0 1-9 9"></path>
          </svg>
          <span className="inline-block px-2">{gitBranch}</span>
        </div>
        <div className="flex gap-2 items-center">
          <div
              className="ml-4 text-xs inline-flex items-center font-bold leading-sm uppercase px-3 py-1 bg-yellow-200 text-yellow-700 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span className="inline-block px-2">{contentId}</span>
          </div>
        </div>
        <div className="flex gap-2 items-center cursor-pointer" onClick={refreshPage}>
          <div className="ml-4 text-xs inline-flex items-center font-bold leading-sm uppercase px-3 py-1 bg-violet-600 text-white rounded-full">
            <svg width="24px" height="24px" viewBox="0 0 24 24" role="img" aria-labelledby="refreshIconTitle" className="stroke-current text-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" color="#000000"> <title id="refreshIconTitle">Refresh</title> <polyline points="22 12 19 15 16 12"/> <path d="M11,20 C6.581722,20 3,16.418278 3,12 C3,7.581722 6.581722,4 11,4 C15.418278,4 19,7.581722 19,12 L19,14"/> </svg>
            <span className="inline-block px-2">Refresh</span>
          </div>
        </div>
      </div>
  );
}
