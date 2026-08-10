import AuthBtn from '@/components/ui/buttons/AuthBtn';
import ContactIconBlock from '@/components/ui/blocks/ContactIconBlock';
import TextInput from '@/components/ui/forms/input/TextInput';
import EmailContactInput from '@/components/ui/forms/input/EmailContactInput';
import PhoneInput from '@/components/ui/forms/input/PhoneInput';
import TextAreaInput from '@/components/ui/forms/input/TextAreaInput';
import Icon from '@/components/ui/icons/Icon';

const title = 'Wasiliana nasi';
const subTitle =
  'Una wazo la kampeni au maswali kuhusu jukwaa? Wasiliana nasi na tupange pamoja uwekaji wako wa Changia.';
const formTitle = 'Jaza fomu hapa chini';
const formSubTitle = 'Tutakujibu ndani ya siku 1 hadi 2 za kazi.';

export default function ContactSectionSw() {
  return (
    <section className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-2xl lg:max-w-5xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-balance text-neutral-800 md:text-4xl md:leading-tight dark:text-neutral-200">
            {title}
          </h1>
          <p className="mt-1 text-pretty text-neutral-600 dark:text-neutral-400">
            {subTitle}
          </p>
        </div>

        <div className="mt-12 grid items-center gap-6 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col rounded-xl p-4 sm:p-6 lg:p-8">
            <h2 className="mb-8 text-xl font-bold text-neutral-700 dark:text-neutral-300">
              {formTitle}
            </h2>
            <form>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextInput id="hs-firstname-contacts" label="Jina la Kwanza" name="hs-firstname-contacts" />
                  <TextInput id="hs-lastname-contacts" label="Jina la Familia" name="hs-lastname-contacts" />
                </div>
                <EmailContactInput id="hs-email-contacts" />
                <PhoneInput id="hs-phone-number" />
                <TextAreaInput id="hs-about-contacts" label="Maelezo" name="hs-about-contacts" />
              </div>
              <div className="mt-4 grid">
                <AuthBtn title="Tuma Ujumbe" />
              </div>
              <div className="mt-3 text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{formSubTitle}</p>
              </div>
            </form>
          </div>

          <div className="divide-y divide-neutral-300 dark:divide-neutral-700">
            <ContactIconBlock
              heading="Mwongozo na nyaraka"
              content="Vinjari miongozo ya jukwaa na mbinu bora za kampeni."
              isLinkVisible
              linkTitle="Tembelea miongozo na mafunzo"
              linkURL="#"
              isArrowVisible
            >
              <Icon name="question" />
            </ContactIconBlock>
            <ContactIconBlock
              heading="FAQ"
              content="Chunguza maswali yanayoulizwa mara kwa mara kwa majibu wazi kuhusu kampeni, wafadhili na ada."
              isLinkVisible
              linkTitle="Tembelea FAQ"
              linkURL="#"
              isArrowVisible
            >
              <Icon name="chatBubble" />
            </ContactIconBlock>
            <ContactIconBlock
              heading="Tunapofanya kazi"
              content="Tanzania — remote-first"
              isAddressVisible
              addressContent="Msaada nchini kote"
            >
              <Icon name="mapPin" />
            </ContactIconBlock>
            <ContactIconBlock
              heading="Wasiliana nasi kwa barua pepe"
              content="Unapendelea maandishi? Tutumie barua pepe kwa"
              isLinkVisible
              linkTitle="hello@changia.co"
              linkURL="#"
            >
              <Icon name="envelopeOpen" />
            </ContactIconBlock>
          </div>
        </div>
      </div>
    </section>
  );
}
