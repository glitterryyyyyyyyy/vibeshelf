import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // You can log the error to an external service here
    // eslint-disable-next-line no-console
    console.error('Uncaught error in subtree:', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2 style={{ color: '#b91c3a' }}>Something went wrong</h2>
          <p style={{ color: '#5a2630' }}>An unexpected error occurred while rendering the app.</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
            {this.state.error && this.state.error.toString()}
            {this.state.info && '\n' + (this.state.info.componentStack || '')}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
