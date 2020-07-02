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
