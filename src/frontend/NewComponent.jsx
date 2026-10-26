import React from 'react';
import { useTheme } from '@mui/material';
import TourismExplorer from './TourismExplorer';
import ErrorBoundary from './components/ErrorBoundary';


function NewComponent(props) {
  const paletteMode = useTheme().palette.mode; 
  
  const { themeName, format } = props.UIOptions ?? {};
  const mode = themeName ?? paletteMode;

  
  const apiUrl = process.env.NODE_ENV === 'production'
    ? (props.deployedBackendURL ?? '')
    : import.meta.env.VITE_API_URL;
  const ready = () => props?.messageHandlers?.componentLoaded();
  return (
    <ErrorBoundary onError={ready}>
      <TourismExplorer
        searchData={props.searchData}
        apiUrl={apiUrl}
        mode={mode}
        format={format}
        onReady={ready}
      />
    </ErrorBoundary>
  );
}
export default NewComponent;
