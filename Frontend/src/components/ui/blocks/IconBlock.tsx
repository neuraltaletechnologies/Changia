type IconBlockProps = {
  heading?: string;
  content?: string;
  children?: React.ReactNode;
};

const headingClasses = 'text-balance text-lg font-bold text-neutral-800 dark:text-neutral-200';
const contentClasses = 'mt-1 text-pretty text-neutral-700 dark:text-neutral-300';

export default function IconBlock({ heading, content, children }: IconBlockProps) {
  return (
    <div className="flex gap-x-5">
      {children}
      <div className="grow">
        <h3 className={headingClasses}>{heading}</h3>
        <p className={contentClasses}>{content}</p>
      </div>
    </div>
  );
}
