import AccordionItem from '@/components/ui/blocks/AccordionItem';

type Faq = {
  question: string;
  answer: string;
};

type FaqGroup = {
  subTitle?: string;
  faqs: Faq[];
};

type FAQProps = {
  title: string;
  faqs: FaqGroup;
};

const makeId = (base: string, index: number) => `${base}${index + 1}`;

export default function FAQ({ title, faqs }: FAQProps) {
  return (
    <section className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 2xl:max-w-full">
      <div className="grid gap-10 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="max-w-xs">
            <h2
              className="text-2xl font-bold text-neutral-800 md:text-4xl md:leading-tight dark:text-neutral-200"
              dangerouslySetInnerHTML={{ __html: title }}
            />
            <p className="mt-1 hidden text-neutral-600 md:block dark:text-neutral-400">
              {faqs.subTitle}
            </p>
          </div>
        </div>
        <div className="md:col-span-3">
          <div className="hs-accordion-group divide-y divide-neutral-200 dark:divide-neutral-700">
            {faqs.faqs.map((q, i) => {
              const id = makeId('hs-basic-with-title-and-arrow-stretched-heading-', i);
              const collapseId = makeId(
                'hs-basic-with-title-and-arrow-stretched-collapse',
                i
              );
              return (
                <AccordionItem
                  key={i}
                  id={id}
                  collapseId={collapseId}
                  question={q.question}
                  answer={q.answer}
                  first={i === 0}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
