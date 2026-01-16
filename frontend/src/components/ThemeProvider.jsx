import React, { useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useTenant } from '../context/TenantContext';

const TenantThemeProvider = ({ children }) => {
  const { tenant, getBranding } = useTenant();
  const branding = getBranding();

  // Create theme based on tenant branding
  const theme = useMemo(() => {
    return createTheme({
      palette: {
        primary: {
          main: branding.primaryColor || '#1976d2',
        },
        secondary: {
          main: branding.secondaryColor || '#dc004e',
        },
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: branding.primaryColor || '#1976d2',
            },
          },
        },
      },
    });
  }, [branding.primaryColor, branding.secondaryColor]);

  // Update page title based on tenant branding
  useEffect(() => {
    const appName = branding.appName || 'Chit Fund Manager';
    document.title = appName;

    // Update theme color meta tag if it exists
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', branding.primaryColor || '#1976d2');
    }
  }, [branding.appName, branding.primaryColor]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

// Default theme provider for non-tenant contexts (super admin)
export const DefaultThemeProvider = ({ children }) => {
  const theme = useMemo(() => {
    return createTheme({
      palette: {
        primary: {
          main: '#1976d2',
        },
        secondary: {
          main: '#dc004e',
        },
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
            },
          },
        },
      },
    });
  }, []);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

export default TenantThemeProvider;
