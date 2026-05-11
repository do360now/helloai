import type { SiteConfig, Model, Category, Article, LocalModel, OpenWeightModel } from './types';

import siteData from './site.json';
import modelsData from './models.json';
import categoriesData from './categories.json';
import articlesData from './articles.json';
import localLeaderboardData from './local_leaderboard.json';
import openWeightModelsData from './open_weight_models.json';

export const getSiteConfig = (): SiteConfig => siteData;
export const getModels = (): Model[] => modelsData;
export const getCategories = (): Category[] => categoriesData;
export const getArticles = (): Article[] => articlesData;
export const getLocalModels = (): LocalModel[] => localLeaderboardData;
export const getOpenWeightModels = (): OpenWeightModel[] => openWeightModelsData;

export const getArticleBySlug = (slug: string): Article | undefined =>
  articlesData.find((a: Article) => a.slug === slug);

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
