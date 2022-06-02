---
title: 销毁阶段
---

## 1. 前言

接下来到了生命周期流程的最后一个阶段——销毁阶段。从官方文档给出的生命周期流程图中可以看到，当调用了`vm.$destroy`方法，`Vue`实例就进入了销毁阶段，该阶段所做的主要工作是将当前的`Vue`实例从其父级实例中删除，取消当前实例上的所有依赖追踪并且移除实例上的所有事件监听器。也就是说，当这个阶段完成之后，当前的`Vue`实例的整个生命流程就全部走完了，最终“寿终正寝”了。

![](~@/lifecycle/7.png)


本篇文章就来分析一下在销毁阶段都做了哪些工作。

## 2. 销毁阶段分析

上文说了，当调用了实例的`$destroy`方法之后，当前实例就进入了销毁阶段。所以分析销毁阶段就是分析`$destroy`方法的内部实现。该方法的定义位于源码的`src/core/instance.lifecycle.js`中，如下：

```javascript
Vue.prototype.$destroy = function () {
  const vm: Component = this
  if (vm._isBeingDestroyed) {
    return
  }
  callHook(vm, 'beforeDestroy')
  vm._isBeingDestroyed = true
  // remove self from parent
  const parent = vm.$parent
  if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
    remove(parent.$children, vm)
  }
  // teardown watchers
  if (vm._watcher) {
    vm._watcher.teardown()
  }
  let i = vm._watchers.length
  while (i--) {
    vm._watchers[i].teardown()
  }
  // remove reference from data ob
  // frozen object may not have observer.
  if (vm._data.__ob__) {
    vm._data.__ob__.vmCount--
  }
  // call the last hook...
  vm._isDestroyed = true
  // invoke destroy hooks on current rendered tree
  vm.__patch__(vm._vnode, null)
  // fire destroyed hook
  callHook(vm, 'destroyed')
  // turn off all instance listeners.
  vm.$off()
  // remove __vue__ reference
  if (vm.$el) {
    vm.$el.__vue__ = null
  }
  // release circular reference (##6759)
  if (vm.$vnode) {
    vm.$vnode.parent = null
  }
}
```

可以看到，在上述代码中，首先判断当前实例的`_isBeingDestroyed`属性是否为`true`，因为该属性标志着当前实例是否处于正在被销毁的状态，如果它为`true`，则直接`return`退出函数，防止反复执行销毁逻辑。如下：

```javascript
const vm: Component = this
if (vm._isBeingDestroyed) {
  return
}
```

接着，触发生命周期钩子函数`beforeDestroy`，该钩子函数的调用标志着当前实例正式开始销毁。如下：

```javascript
callHook(vm, 'beforeDestroy')
```

接下来，就进入了当前实例销毁的真正逻辑。

首先，需要将当前的`Vue`实例从其父级实例中删除，如下：

```javascript
const parent = vm.$parent
if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
  remove(parent.$children, vm)
}
```

上面代码表示：如果当前实例有父级实例，同时该父级实例没有被销毁并且不是抽象组件，那么就将当前实例从其父级实例的`$children`属性中删除，即将自己从父级实例的子实例列表中删除。

把自己从父级实例的子实例列表中删除之后，接下来就开始将自己身上的依赖追踪和事件监听移除。

我们知道， 实例身上的依赖包含两部分：一部分是实例自身依赖其他数据，需要将实例自身从其他数据的依赖列表中删除；另一部分是实例内的数据对其他数据的依赖（如用户使用`$watch`创建的依赖），也需要从其他数据的依赖列表中删除实例内数据。所以删除依赖的时候需要将这两部分依赖都删除掉。如下：

```javascript
// teardown watchers
if (vm._watcher) {
  vm._watcher.teardown()
}
let i = vm._watchers.length
while (i--) {
  vm._watchers[i].teardown()
}
```

在上述代码中，首先执行`vm._watcher.teardown()`将实例自身从其他数据的依赖列表中删除，`teardown`方法的作用是从所有依赖向的`Dep`列表中将自己删除。然后，在前面文章介绍`initState`函数时我们知道，所有实例内的数据对其他数据的依赖都会存放在实例的`_watchers`属性中，所以我们只需遍历`_watchers`，将其中的每一个`watcher`都调用`teardown`方法，从而实现移除实例内数据对其他数据的依赖。

接下来移除实例内响应式数据的引用、给当前实例上添加`_isDestroyed`属性来表示当前实例已经被销毁，同时将实例的`VNode`树设置为`null`，如下：

```javascript
if (vm._data.__ob__) {
  vm._data.__ob__.vmCount--
}
vm._isDestroyed = true
vm.__patch__(vm._vnode, null)
```

接着，触发生命周期钩子函数`destroyed`，如下：

```javascript
callHook(vm, 'destroyed')
```

最后，调用实例的`vm.$off`方法（关于该方法在后面介绍实例方法时会详细介绍），移除实例上的所有事件监听器。如下：

```javascript
vm.$off()
```

最后，再移除一些相关属性的引用，至此，当前实例算是销毁完毕。

## 3. 总结

本篇文章介绍了生命周期流程的最后一个阶段——销毁阶段。

我们知道了，当调用了实例上的`vm.$destory`方法后，实例就进入了销毁阶段，在该阶段所做的主要工作是将当前的`Vue`实例从其父级实例中删除，取消当前实例上的所有依赖追踪并且移除实例上的所有事件监听器。并且对照源码将所做的工作都进行了逐行分析。
