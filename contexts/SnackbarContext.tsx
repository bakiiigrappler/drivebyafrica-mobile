import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Snackbar, SnackbarAction } from '@/components/ui/Snackbar';

export interface SnackbarOptions {
  message: string;
  icon?: string;
  action?: SnackbarAction;
  duration?: number;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface SnackbarContextType {
  showSnackbar: (options: SnackbarOptions) => void;
  hideSnackbar: () => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

// Global ref for calling snackbar from outside React components (like hooks)
let globalSnackbarRef: ((options: SnackbarOptions) => void) | null = null;

export function showGlobalSnackbar(options: SnackbarOptions) {
  if (globalSnackbarRef) {
    globalSnackbarRef(options);
  }
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<SnackbarOptions>({
    message: '',
  });

  const showSnackbar = useCallback((opts: SnackbarOptions) => {
    setOptions(opts);
    setVisible(true);
  }, []);

  const hideSnackbar = useCallback(() => {
    setVisible(false);
  }, []);

  // Set global ref on mount
  useEffect(() => {
    globalSnackbarRef = showSnackbar;
    return () => {
      globalSnackbarRef = null;
    };
  }, [showSnackbar]);

  return (
    <SnackbarContext.Provider value={{ showSnackbar, hideSnackbar }}>
      {children}
      <Snackbar
        visible={visible}
        message={options.message}
        icon={options.icon as any}
        action={options.action}
        duration={options.duration}
        type={options.type}
        onDismiss={hideSnackbar}
      />
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
}
