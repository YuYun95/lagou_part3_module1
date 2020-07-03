## 一、Vue-Router 原理实现

### Hash 模式和 History 模式的区别
* 表现形式的区别
    * Hash 模式域名后面带有'#'，# 后面的是路由地址，可以通过问号携带参数
    * History 模式就是正常的url地址，需要服务端配置支持
* 原理区别
    * Hash 模式是基于锚点，通过锚点值作为路由地址；以及 onhashchange 事件，地址发生变化是触发onhashchange
    * History 模式是基于 HTML5 中的History API
        * history.pushState()，路径会发生变化，向服务器发送请求，IE10以后才支持
        * history.replaceState() 不会向服务器发送请求，只会改变浏览器地址，并且把地址记录在历史记录

### History 模式
* history 模式需要服务器的支持
* 单页应用中，服务器不存在http://www.xxx.com/login 这样的地址会返回找不到改页面（单页应用只有一个index.html，不存在login页面）
* 在服务端应该除了静态资源外都返回单页引用的index.html

### VueRouter 实现原理
* Hash 模式
    * URL中 # 后面的内容作为路径地址
    * 监听 hashchange 事件
    * 根据当前路由地址找到对应组件重新渲染
* History 模式
    * 通过 history.pushState() 方法改变地址栏
    * 监听 popstate 事件，把访问地址记录在历史，并不会真正跳转路径，也就是浏览器不会发送请求；可以监听到浏览器操作历史的变化，在这个事件处理函数中，可以记录改变后的地址
    * 根据当前路由地址找到对应组件重新渲染

### VueRouter 模拟实现-分析
* Vue.use 方法可以接收一个函数，如果是函数会直接调用这个函数；可以传入对象，传入对象，会调用这个对象的install方法
* 创建一个VueRouter实例， VueRouter 是一个构造函数或者是一个类，这个类有一个静态的install方法
* VueRouter构造函数接收一个对象形式的参数，对象是一些路由规则
* 创建 Vue 实例，传入刚刚定义好的 router 对象

![](img/router.jpg)

* VueRouter：类名
* options：VueRouter实例传入的路由规则对象
* routeMap：记录路由地址和组件的对应关系，以后把路由规则解析到routeMap
* data：是一个对象，有个current属性，用来记录当前路由地址。设置data是因为需要一个响应式的数据（data是响应式），路由发送变化，对应的组件要更新
* install：是类的静态方法，实现 vue 的插件机制
* constructor：初始化属性，初始化方法
* init：调用后面的方法
* initEvent：注册popstate事件，监听浏览器历史的变化
* createRouteMap：初始化 routeMap 属性，把构造函数中出入的路由规则转换为键值对形式存储到routeMap，routeMap 就是一个对象，键是路由地址，值是对应的组件；在 router-view 组件中会使用 routeMap
* initComponents：创建 router-link 和 router-view 组件

```javascript
Vue.use(VueRouter)

const router = new VueRouter({
  routes: [
    { name: 'home', path: '/', component: homeComponent }
  ]
})

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
```

### VueRouter-install
