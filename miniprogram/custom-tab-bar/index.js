Component({
  data: {
    selected: 'learn',
    tabs: [
      { page: 'learn', text: '题库', icon: 'book' },
      { page: 'stats', text: '统计', icon: 'stats' },
      { page: 'profile', text: '我的', icon: 'user' },
    ],
  },
  lifetimes: {
    attached() { this.syncSelected(); },
  },
  pageLifetimes: {
    show() { this.syncSelected(); },
  },
  methods: {
    syncSelected(page) {
      const pages = getCurrentPages();
      const current = pages[pages.length - 1];
      const tab = this.data.tabs.find((item) => page ? item.page === page : current && current.route === `pages/${item.page}/index`);
      if (tab && this.data.selected !== tab.page) this.setData({ selected: tab.page });
    },
    switchTab(event) {
      const page = event.currentTarget.dataset.page;
      if (page === this.data.selected || !this.data.tabs.some((tab) => tab.page === page)) return;
      wx.switchTab({ url: `/pages/${page}/index` });
    },
  },
});
