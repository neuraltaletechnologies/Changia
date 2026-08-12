'use client';

import { useState } from 'react';
import Image from 'next/image';
import PrimaryCTA from '@/components/ui/buttons/PrimaryCTA';
import type { CampaignData } from '@/lib/types';

export default function CampaignTabs({ campaign }: { campaign: CampaignData }) {
  const [active, setActive] = useState(0);
  const tabs = campaign.tabs;

  return (
    <div className="mx-auto max-w-[85rem] px-4 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <nav
        className="mx-auto grid max-w-6xl gap-y-px sm:flex sm:gap-x-4 sm:gap-y-0"
        aria-label="Tabs"
        role="tablist"
      >
        {tabs.map((tab, index) => {
          const isActive = index === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(index)}
              role="tab"
              aria-selected={isActive}
              className={`flex w-full justify-center rounded-xl border border-transparent p-3 outline-hidden ring-zinc-500 transition duration-300 hover:bg-neutral-100 focus-visible:ring-3 dark:ring-zinc-200 dark:hover:bg-neutral-700 dark:focus:outline-hidden md:p-5 ${
                isActive ? 'active bg-neutral-100 hover:border-transparent dark:bg-white/[.05]' : ''
              }`}
            >
              <span
                className={`block text-center font-bold ${
                  isActive
                    ? 'text-orange-400 dark:text-orange-300'
                    : 'text-neutral-800 dark:text-neutral-200'
                }`}
              >
                {tab.title}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mx-auto max-w-[85rem] px-4 pb-10 pt-12 sm:px-6 lg:px-8 lg:pb-14 md:mt-4">
        {active === 0 && (
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
                {campaign.longDescription.title}
              </h2>
              <p className="mt-4 text-lg text-pretty text-neutral-700 dark:text-neutral-300">
                {campaign.longDescription.subTitle}
              </p>
              <div className="mt-6">
                <PrimaryCTA title={campaign.longDescription.btnTitle} url={campaign.longDescription.btnURL} />
              </div>
            </div>
            <div className="space-y-8">
              {campaign.descriptionList.map((item) => (
                <div key={item.title}>
                  <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-pretty text-neutral-600 dark:text-neutral-400">
                    {item.subTitle}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 1 && (
          <div className="grid gap-12 md:grid-cols-2">
            <div className="space-y-8">
              {campaign.specificationsLeft.map((item) => (
                <div key={item.title}>
                  <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-pretty text-neutral-600 dark:text-neutral-400">
                    {item.subTitle}
                  </p>
                </div>
              ))}
            </div>
            {campaign.specificationsRight?.length ? (
              <div className="space-y-8">
                {campaign.specificationsRight.map((item) => (
                  <div key={item.title}>
                    <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-pretty text-neutral-600 dark:text-neutral-400">
                      {item.subTitle}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {active === 2 && (
          <div className="grid gap-6 sm:grid-cols-2">
            {campaign.blueprints.first ? (
              <Image
                className="w-full rounded-xl"
                src={campaign.blueprints.first}
                alt="Blueprint 1"
                width={800}
                height={600}
              />
            ) : null}
            {campaign.blueprints.second ? (
              <Image
                className="w-full rounded-xl"
                src={campaign.blueprints.second}
                alt="Blueprint 2"
                width={800}
                height={600}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
