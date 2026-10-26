import { Component } from 'react';

// Last line of defence: a render error must not blank the whole Dart Frame.
// It also tells the platform the component is "loaded", otherwise the host would keep waiting.
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) {
    console.error('[tourism] render error', error);
    this.props.onError?.();
  }
  render() {
    return this.state.failed
      ? <div className="tx-root"><div className="tx-state" role="alert"><p>Something went wrong while showing places. Please search again.</p></div></div>
      : this.props.children;
  }
}
