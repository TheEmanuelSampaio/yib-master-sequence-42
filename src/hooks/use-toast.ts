import * as React from "react";
import { 
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider, 
  ToastTitle, 
  ToastViewport 
} from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1000000;

export type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

type ToastActionType = (props: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
}) => {
  id: string;
  dismiss: () => void;
  update: (props: ToasterToast) => void;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let listeners: ((state: State) => void)[] = [];

let memoryState: State = { toasts: [] };

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
      id: string;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      id?: string;
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      id: string;
    };

interface State {
  toasts: ToasterToast[];
}

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, ...action.toast } : t
        ),
      };

    case "DISMISS_TOAST": {
      const { id } = action;

      if (id === undefined) {
        return {
          ...state,
          toasts: state.toasts.map((t) => ({
            ...t,
          })),
        };
      }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === id
            ? {
                ...t,
              }
            : t
        ),
      };
    }

    case "REMOVE_TOAST":
      if (action.id === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };
    default:
      return state;
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  const toast = React.useMemo<ToastActionType>(() => {
    function toast(props: {
      title?: React.ReactNode;
      description?: React.ReactNode;
      action?: React.ReactNode;
      variant?: "default" | "destructive";
    }) {
      const id = genId();

      const update = (props: ToasterToast) =>
        dispatch({
          type: "UPDATE_TOAST",
          id,
          toast: { ...props },
        });

      const dismiss = () => dispatch({ type: "DISMISS_TOAST", id });

      dispatch({
        type: "ADD_TOAST",
        toast: {
          ...props,
          id,
        },
      });

      return {
        id,
        dismiss,
        update,
      };
    }

    return toast;
  }, []);

  return {
    ...state,
    toast,
  };
}

// Create the toast function with methods
const toast = ((props: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
}) => {
  const id = genId();

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
    },
  });

  return {
    id,
    dismiss: () => dispatch({ type: "DISMISS_TOAST", id }),
    update: (props: ToasterToast) =>
      dispatch({
        type: "UPDATE_TOAST",
        id,
        toast: { ...props },
      }),
  };
}) as ToastActionType & {
  success: (message: string) => ReturnType<ToastActionType>;
  error: (message: string) => ReturnType<ToastActionType>;
  warning: (message: string) => ReturnType<ToastActionType>;
  info: (message: string) => ReturnType<ToastActionType>;
};

// Add helper methods
toast.success = (message: string) => 
  toast({ title: "Sucesso", description: message });

toast.error = (message: string) => 
  toast({ title: "Erro", description: message, variant: "destructive" });

toast.warning = (message: string) => 
  toast({ title: "Atenção", description: message, variant: "destructive" });

toast.info = (message: string) => 
  toast({ title: "Informação", description: message });

export { useToast, toast };
