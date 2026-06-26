export type ActionFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialActionFormState: ActionFormState = {
  status: "idle"
};
