// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://pca-exam-guide.pages.dev',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [sitemap()],

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      langs: [
        {
          name: 'promql',
          scopeName: 'source.promql',
          grammar: {
            scopeName: 'source.promql',
            patterns: [
              { match: '\\b(rate|irate|increase|histogram_quantile|predict_linear|delta|idelta|deriv|abs|ceil|floor|round|time|timestamp|label_replace|label_join|absent|absent_over_time|changes|resets|sort|sort_desc|vector|scalar|clamp|clamp_min|clamp_max|avg_over_time|sum_over_time|min_over_time|max_over_time|count_over_time|stddev_over_time|stdvar_over_time|last_over_time|quantile_over_time)\\b', name: 'support.function.promql' },
              { match: '\\b(sum|avg|min|max|count|stddev|stdvar|topk|bottomk|count_values|quantile)\\b', name: 'support.function.promql' },
              { match: '\\b(and|or|unless|on|ignoring|group_left|group_right|by|without)\\b', name: 'keyword.operator.promql' },
              { match: '\\b(offset|true|false|null)\\b', name: 'constant.language.promql' },
              { match: '(#.*$)', name: 'comment.line.number-sign.promql' },
              { match: '("(?:[^"\\\\]|\\\\.)*")', name: 'string.quoted.double.promql' },
              { match: '(\'(?:[^\'\\\\]|\\\\.)*\')', name: 'string.quoted.single.promql' },
              { match: '\\b(\\d+\\.?\\d*)\\b', name: 'constant.numeric.promql' },
            ]
          }
        }
      ]
    }
  }
});
