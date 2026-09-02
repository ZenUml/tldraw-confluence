import React from 'react';
import { whiteboardAnalytics } from '../utils/analytics/analytics';

export default class WhiteboardErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    whiteboardAnalytics.track('whiteboard_render_failed', {
      error_code: 'editor_render_failed',
    });
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="alert" className="flex h-full items-center justify-center p-6 text-center">
          Whiteboard could not be rendered safely. Your stored data has not been changed.
        </div>
      );
    }
    return this.props.children;
  }
}
