type CheckboxProps = {
  label?: string;
  id?: string;
  children?: React.ReactNode;
};

export default function Checkbox({
  label = 'Remember me',
  id,
  children,
}: CheckboxProps) {
  return (
    <div className="flex items-center">
      <div className="flex">
        <input
          id={id}
          name="remember-me"
          type="checkbox"
          className="pointer-events-none mt-0.5 shrink-0 rounded-sm border-neutral-200 text-neutral-600 focus:ring-yellow-400 dark:border-neutral-700 dark:bg-neutral-800 dark:checked:border-yellow-400 dark:checked:bg-yellow-400 dark:focus:ring-offset-neutral-800"
        />
      </div>
      <div className="ms-3">
        <label htmlFor={id} className="text-sm text-neutral-800 dark:text-neutral-200">
          {label} {children}
        </label>
      </div>
    </div>
  );
}
