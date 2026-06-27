export type ActionFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  meta?: Record<string, unknown>;
};

export const initialActionFormState: ActionFormState = {
  status: "idle"
};
