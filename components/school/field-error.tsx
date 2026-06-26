export function FieldError({ error }: { error?: string[] }) {
  if (!error?.length) {
    return null;
  }

  return (
    <p role="alert" className="text-sm font-medium text-red-600">
      {error[0]}
    </p>
  );
}
