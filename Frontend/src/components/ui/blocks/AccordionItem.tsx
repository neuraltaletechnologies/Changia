import Icon from '@/components/ui/icons/Icon';

type AccordionItemProps = {
  id: string;
  collapseId: string;
  question: string;
  answer: string;
  first?: boolean;
};

const ACCORDION_CLASS_DEFAULT = 'hs-accordion pb-3 active';
const ACCORDION_CLASS_COLLAPSED = 'hs-accordion pt-6 pb-3';
const ACCORDION_CONTENT_CLASS =
  'hs-accordion-content w-full overflow-hidden transition-[height] duration-300';

export default function AccordionItem({
  id,
  collapseId,
  question,
  answer,
  first,
}: AccordionItemProps) {
  const accordionClass = first
    ? ACCORDION_CLASS_DEFAULT
    : ACCORDION_CLASS_COLLAPSED;

  return (
    <div className={accordionClass} id={id}>
      <button
        className="hs-accordion-toggle group inline-flex w-full items-center justify-between gap-x-3 rounded-lg pb-3 text-start font-bold text-balance text-neutral-800 ring-zinc-500 outline-hidden transition hover:text-neutral-500 focus-visible:ring-3 md:text-lg dark:text-neutral-200 dark:ring-zinc-200 dark:hover:text-neutral-400 dark:focus:outline-hidden"
        aria-expanded={first}
        aria-controls={collapseId}
      >
        {question}
        <Icon name="accordionNotActive" />
        <Icon name="accordionActive" />
      </button>
      <div
        id={collapseId}
        role="region"
        aria-labelledby={id}
        className={`${first ? ACCORDION_CONTENT_CLASS : 'hidden ' + ACCORDION_CONTENT_CLASS}`}
      >
        <p className="text-pretty text-neutral-600 dark:text-neutral-400">{answer}</p>
      </div>
    </div>
  );
}
