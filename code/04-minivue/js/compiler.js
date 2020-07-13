class Compiler {
  constructor(vm) {
    this.el = vm.$el // DOM 对象
    this.vm = vm // Vue实例
    this.compile(this.el)
  }

  // 编译模板，处理文本节点和元素节点
  compile(el) {
    let childNones = el.childNodes
    Array.from(childNones).forEach(node => {
      // 处理文本节点
      if (this.isTextNode(node)) {
        this.compileText(node)
      } else if (this.isElementNode(node)) {
        // 处理元素节点
        this.compileElement(node)
      }

      // 判断node节点，是否有子节点，如果仅有子节点，要递归调用compile
      if (node.childNodes && node.childNodes.length) {
        this.compile(node)
      }
    })
  }

  // 编译元素节点(获取元素的属性节点)，处理指令
  compileElement(node) {
    // console.log(node.attributes)
    // 遍历所有的属性节点
    Array.from(node.attributes).forEach(attr => {
      // 判断是否是指令
      let attrName = attr.name
      if (this.isDirective(attrName)) {
        // v-text --> text
        attrName = attrName.substring(2)
        let key = attr.value
        this.update(node, key, attrName)
      }
    })
  }

  event(node, key, attrName) {
    let eventFn = this[attrName + 'Handler']
    eventFn && eventFn.call(this, node, this.vm[key], key)
  }

  // 根据指令拼接函数(不需要if语句)，调用对于的指令处理函数
  update(node, key, attrName) {
    if (attrName.startsWith('on:')) {
      attrName = attrName.replace('on:', '')
    }

    let updateFn = this[attrName + 'Updater']
    updateFn && updateFn.call(this, node, this.vm[key], key)
  }

  clickUpdater(node, value, key) {
    node.onclick = value
  }

  mouseoverUpdater(node, value, key) {
    node.onmouseover = value
  }

  // 处理 v-text 指令
  textUpdater(node, value, key) {
    node.textContent = value
    new Watcher(this.vm, key, (newValue) => {
      node.textContent = newValue
    })
  }

  htmlUpdater(node, value, key) {
    node.innerHTML = value
    new Watcher(this.vm, key, (newValue) => {
      node.innerHTML = newValue
    })
  }

  // v-model
  modelUpdater(node, value, key) {
    node.value = value
    new Watcher(this.vm, key, (newValue) => {
      node.value = newValue
    })
    // 双向绑定
    node.addEventListener('input', () => {
      this.vm[key] = node.value
    })
  }

  // 编译文本节点，处理差值表达式
  compileText(node) {
    // {{   msg }}
    // 匹配差值表达式，获取差值表达式中的内容
    let reg = /\{\{(.+?)\}\}/
    let value = node.textContent

    // 如果文本节点是差值表达式，就替换内容
    if (reg.test(value)) {
      let key = RegExp.$1.trim() // 获取正则匹配的第一个分组
      node.textContent = value.replace(reg, this.vm[key])

      // 创建watcher对象，当数据改变跟新视图
      new Watcher(this.vm, key, (newValue) => {
        node.textContent = newValue
      })
    }
  }

  // 判断元素属性是否是指令
  isDirective(attrName) {
    return attrName.startsWith('v-') || attrName.startsWith('@')
  }

  // 判断节点是否是文本节点
  isTextNode(node) {
    return node.nodeType === 3
  }

  // 判断节点是否是元素节点
  isElementNode(node) {
    return node.nodeType === 1
  }
}
