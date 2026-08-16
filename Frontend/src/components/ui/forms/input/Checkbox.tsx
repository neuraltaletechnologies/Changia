type CheckboxProps = {
  label?: string;
  id?: string;
  children?: React.ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
};

export default function Checkbox({
  label = 'Remember me',
  id,
  children,
  checked,
  onChange,
}: CheckboxProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center">
      <input
        id={id}
        name="remember-me"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5 shrink-0 rounded-sm border-neutral-200 text-neutral-600 focus:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-800 dark:checked:border-emerald-500 dark:checked:bg-emerald-500 dark:focus:ring-offset-neutral-800"
      />
      <span className="ms-3 text-sm text-neutral-800 dark:text-neutral-200">
        {label} {children}
      </span>
    </label>
  );
}
