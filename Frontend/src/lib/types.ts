import type { StaticImageData } from 'next/image';

export interface BlogData {
  title: string;
  description: string;
  contents: string[];
  author: string;
  role?: string;
  authorImage: StaticImageData;
  authorImageAlt: string;
  pubDate: Date;
  cardImage: StaticImageData;
  cardImageAlt: string;
  readTime: number;
  tags?: string[];
}

export interface ProductData {
  title: string;
  description: string;
  main: {
    id: number;
    content: string;
    imgCard: StaticImageData;
    imgMain: StaticImageData;
    imgAlt: string;
  };
  tabs: { id: string; dataTab: string; title: string }[];
  longDescription: {
    title: string;
    subTitle: string;
    btnTitle: string;
    btnURL: string;
  };
  descriptionList: { title: string; subTitle: string }[];
  specificationsLeft: { title: string; subTitle: string }[];
  specificationsRight?: { title: string; subTitle: string }[];
  tableData?: {
    feature: string[];
    description: string[][];
  }[];
  blueprints: {
    first?: StaticImageData;
    second?: StaticImageData;
  };
}

export interface InsightData {
  title: string;
  description: string;
  cardImage: StaticImageData;
  cardImageAlt: string;
}
