export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/categories/index',
    'pages/search/index',
  ],
  tabBar: {
    color: '#8C8877',
    selectedColor: '#C4321A',
    backgroundColor: '#F8F4ED',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/index/index', text: '首页' },
      { pagePath: 'pages/categories/index', text: '藏品' },
      { pagePath: 'pages/search/index', text: '搜索' },
    ],
  },
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#F8F4ED',
    navigationBarTitleText: '平阳木版年画',
    navigationBarTextStyle: 'black',
  },
})
