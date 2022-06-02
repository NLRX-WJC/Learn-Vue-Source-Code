---
title: 数据相关的方法
---

## 0. 前言

与数据相关的实例方法有 3 个，分别是`vm.$set`、`vm.$delete`和`vm.$watch`。它们是在`stateMixin`函数中挂载到`Vue`原型上的，代码如下：

```javascript
import { set, del } from "../observer/index";

export function stateMixin(Vue) {
  Vue.prototype.$set = set;
  Vue.prototype.$delete = del;
  Vue.prototype.$watch = function(expOrFn, cb, options) {};
}
```

当执行`stateMixin`函数后，会向`Vue`原型上挂载上述 3 个实例方法。

接下来，我们就来分析这 3 个与数据相关的实例方法其内部的原理都是怎样的。

## 1. vm.\$watch

### 1.1 用法回顾

在介绍方法的内部原理之前，我们先根据官方文档示例回顾一下它的用法。

```javascript
vm.$watch(expOrFn, callback, [options]);
```

- **参数**：

  - `{string | Function} expOrFn`
  - `{Function | Object} callback`
  - `{Object} [options]`
    - `{boolean} deep`
    - `{boolean} immediate`

- **返回值**：`{Function} unwatch`

- **用法**：

  观察 `Vue` 实例变化的一个表达式或计算属性函数。回调函数得到的参数为新值和旧值。表达式只接受监督的键路径。对于更复杂的表达式，用一个函数取代。

  注意：在变异 (不是替换) 对象或数组时，旧值将与新值相同，因为它们的引用指向同一个对象/数组。`Vue` 不会保留变异之前值的副本。

- **示例**：

  ```javascript
  // 键路径
  vm.$watch("a.b.c", function(newVal, oldVal) {
    // 做点什么
  });

  // 函数
  vm.$watch(
    function() {
      // 表达式 `this.a + this.b` 每次得出一个不同的结果时
      // 处理函数都会被调用。
      // 这就像监听一个未被定义的计算属性
      return this.a + this.b;
    },
    function(newVal, oldVal) {
      // 做点什么
    }
  );
  ```

  `vm.$watch` 返回一个取消观察函数，用来停止触发回调：

  ```javascript
  var unwatch = vm.$watch("a", cb);
  // 之后取消观察
  unwatch();
  ```

- **选项：deep**

  为了发现对象内部值的变化，可以在选项参数中指定 `deep: true` 。注意监听数组的变动不需要这么做。

  ```javascript
  vm.$watch("someObject", callback, {
    deep: true
  });
  vm.someObject.nestedValue = 123;
  // callback is fired
  ```

- **选项：immediate**

  在选项参数中指定 `immediate: true` 将立即以表达式的当前值触发回调：

  ```javascript
  vm.$watch("a", callback, {
    immediate: true
  });
  // 立即以 `a` 的当前值触发回调
  ```

  注意在带有 `immediate` 选项时，你不能在第一次回调时取消侦听给定的 property。

  ```javascript
  // 这会导致报错
  var unwatch = vm.$watch(
    "value",
    function() {
      doSomething();
      unwatch();
    },
    { immediate: true }
  );
  ```

  如果你仍然希望在回调内部调用一个取消侦听的函数，你应该先检查其函数的可用性：

  ```javascript
  var unwatch = vm.$watch(
    "value",
    function() {
      doSomething();
      if (unwatch) {
        unwatch();
      }
    },
    { immediate: true }
  );
  ```

### 1.2 内部原理

`$watch`的定义位于源码的`src/core/instance/state.js`中，如下：

```javascript
Vue.prototype.$watch = function(expOrFn, cb, options) {
  const vm: Component = this;
  if (isPlainObject(cb)) {
    return createWatcher(vm, expOrFn, cb, options);
  }
  options = options || {};
  options.user = true;
  const watcher = new Watcher(vm, expOrFn, cb, options);
  if (options.immediate) {
    cb.call(vm, watcher.value);
  }
  return function unwatchFn() {
    watcher.teardown();
  };
};
```

可以看到，`$watch`方法的代码并不多，逻辑也不是很复杂。

在函数内部，首先判断传入的回调函数是否为一个对象，就像下面这种形式：

```javascript
vm.$watch("a.b.c", {
  handler: function(val, oldVal) {
    /* ... */
  },
  deep: true
});
```

如果传入的回调函数是个对象，那就表明用户是把第二个参数回调函数`cb`和第三个参数选项`options`合起来传入的，此时调用`createWatcher`函数，该函数定义如下：

```javascript
function createWatcher(vm, expOrFn, handler, options) {
  if (isPlainObject(handler)) {
    options = handler;
    handler = handler.handler;
  }
  if (typeof handler === "string") {
    handler = vm[handler];
  }
  return vm.$watch(expOrFn, handler, options);
}
```

可以看到，该函数内部其实就是从用户合起来传入的对象中把回调函数`cb`和参数`options`剥离出来，然后再以常规的方式调用`$watch`方法并将剥离出来的参数穿进去。

接着获取到用户传入的`options`，如果用户没有传入则将其赋值为一个默认空对象，如下：

```javascript
options = options || {};
```

`$watch`方法内部会创建一个`watcher`实例，由于该实例是用户手动调用`$watch`方法创建而来的，所以给`options`添加`user`属性并赋值为`true`，用于区分用户创建的`watcher`实例和`Vue`内部创建的`watcher`实例，如下：

```javascript
options.user = true;
```

接着，传入参数创建一个`watcher`实例，如下：

```javascript
const watcher = new Watcher(vm, expOrFn, cb, options);
```

接着判断如果用户在选项参数`options`中指定的`immediate`为`true`，则立即用被观察数据当前的值触发回调，如下：

```javascript
if (options.immediate) {
  cb.call(vm, watcher.value);
}
```

最后返回一个取消观察函数`unwatchFn`，用来停止触发回调。如下：

```javascript
return function unwatchFn() {
  watcher.teardown();
};
```

这个取消观察函数`unwatchFn`内部其实是调用了`watcher`实例的`teardown`方法，那么我们来看一下这个`teardown`方法是如何实现的。其代码如下：

```javascript
export default class Watcher {
  constructor(/* ... */) {
    // ...
    this.deps = [];
  }
  teardown() {
    let i = this.deps.length;
    while (i--) {
      this.deps[i].removeSub(this);
    }
  }
}
```

在之前介绍变化侦测篇的文章中我们说过，谁读取了数据，就表示谁依赖了这个数据，那么谁就会存在于这个数据的依赖列表中，当这个数据变化时，就会通知谁。也就是说，如果谁不想依赖这个数据了，那么只需从这个数据的依赖列表中把谁删掉即可。

在上面代码中，创建`watcher`实例的时候会读取被观察的数据，读取了数据就表示依赖了数据，所以`watcher`实例就会存在于数据的依赖列表中，同时`watcher`实例也记录了自己依赖了哪些数据，另外我们还说过，每个数据都有一个自己的依赖管理器`dep`，`watcher`实例记录自己依赖了哪些数据其实就是把这些数据的依赖管理器`dep`存放在`watcher`实例的`this.deps = []`属性中，当取消观察时即`watcher`实例不想依赖这些数据了，那么就遍历自己记录的这些数据的依赖管理器，告诉这些数据可以从你们的依赖列表中把我删除了。

举个例子：

```javascript
vm.$watch(
  function() {
    return this.a + this.b;
  },
  function(newVal, oldVal) {
    // 做点什么
  }
);
```

例如上面`watcher`实例，它观察了数据`a`和数据`b`，那么它就依赖了数据`a`和数据`b`，那么这个`watcher`实例就存在于数据`a`和数据`b`的依赖管理器`depA`和`depB`中，同时`watcher`实例的`deps`属性中也记录了这两个依赖管理器，即`this.deps=[depA,depB]`，

当取消观察时，就遍历`this.deps`，让每个依赖管理器调用其`removeSub`方法将这个`watcher`实例从自己的依赖列表中删除。

下面还有最后一个问题，当选项参数`options`中的`deep`属性为`true`时，如何实现深度观察呢？

首先我们来看看什么是深度观察，假如有如下被观察的数据：

```javascript
obj = {
  a: 2
};
```

所谓深度观察，就是当`obj`对象发生变化时我们会得到通知，通知当`obj.a`属性发生变化时我们也要能得到通知，简单的说就是观察对象内部值的变化。

要实现这个功能也不难，我们知道，要想让数据变化时通知我们，那我们只需成为这个数据的依赖即可，因为数据变化时会通知它所有的依赖，那么如何成为数据的依赖呢，很简单，读取一下数据即可。也就是说我们只需在创建`watcher`实例的时候把`obj`对象内部所有的值都递归的读一遍，那么这个`watcher`实例就会被加入到对象内所有值的依赖列表中，之后当对象内任意某个值发生变化时就能够得到通知了。

有了初步的思想后，接下来我们看看代码中是如何实现的。我们知道，在创建`watcher`实例的时候，会执行`Watcher`类中`get`方法来读取一下被观察的数据，如下：

```javascript
export default class Watcher {
  constructor(/* ... */) {
    // ...
    this.value = this.get();
  }
  get() {
    // ...
    // "touch" every property so they are all tracked as
    // dependencies for deep watching
    if (this.deep) {
      traverse(value);
    }
    return value;
  }
}
```

可以看到，在`get`方法中，如果传入的`deep`为`true`，则会调用`traverse`函数，并且在源码中，对于这一步操作有个很形象的注释：

```text
"touch" every property so they are all tracked as dependencies for deep watching

“触摸”每个属性，以便将它们全部作为深度监视的依赖项进行跟踪
```

所谓“触摸”每个属性，不就是将每个属性都读取一遍么？哈哈

回到代码，`traverse`函数定义如下：

```javascript
const seenObjects = new Set();

export function traverse(val: any) {
  _traverse(val, seenObjects);
  seenObjects.clear();
}

function _traverse(val: any, seen: SimpleSet) {
  let i, keys;
  const isA = Array.isArray(val);
  if (
    (!isA && !isObject(val)) ||
    Object.isFrozen(val) ||
    val instanceof VNode
  ) {
    return;
  }
  if (val.__ob__) {
    const depId = val.__ob__.dep.id;
    if (seen.has(depId)) {
      return;
    }
    seen.add(depId);
  }
  if (isA) {
    i = val.length;
    while (i--) _traverse(val[i], seen);
  } else {
    keys = Object.keys(val);
    i = keys.length;
    while (i--) _traverse(val[keys[i]], seen);
  }
}
```

可以看到，该函数其实就是个递归遍历的过程，把被观察数据的内部值都递归遍历读取一遍。

首先先判断传入的`val`类型，如果它不是`Array`或`object`，再或者已经被冻结，那么直接返回，退出程序。如下：

```javascript
const isA = Array.isArray(val);
if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
  return;
}
```

然后拿到`val`的`dep.id`，存入创建好的集合`seen`中，因为集合相比数据而言它有天然的去重效果，以此来保证存入的`dep.id`没有重复，不会造成重复收集依赖，如下：

```javascript
if (val.__ob__) {
  const depId = val.__ob__.dep.id;
  if (seen.has(depId)) {
    return;
  }
  seen.add(depId);
}
```

接下来判断如果是数组，则循环数组，将数组中每一项递归调用`_traverse`；如果是对象，则取出对象所有的`key`，然后执行读取操作，再递归内部值，如下：

```javascript
if (isA) {
  i = val.length;
  while (i--) _traverse(val[i], seen);
} else {
  keys = Object.keys(val);
  i = keys.length;
  while (i--) _traverse(val[keys[i]], seen);
}
```

这样，把被观察数据内部所有的值都递归的读取一遍后，那么这个`watcher`实例就会被加入到对象内所有值的依赖列表中，之后当对象内任意某个值发生变化时就能够得到通知了。

## 2. vm.\$set

`vm.$set` 是全局 `Vue.set` 的**别名**，其用法相同。

### 2.1 用法回顾

在介绍方法的内部原理之前，我们先根据官方文档示例回顾一下它的用法。

```javascript
vm.$set(target, propertyName / index, value);
```

- **参数**：

  - `{Object | Array} target`
  - `{string | number} propertyName/index`
  - `{any} value`

- **返回值**：设置的值。

- **用法**：

  向响应式对象中添加一个属性，并确保这个新属性同样是响应式的，且触发视图更新。它必须用于向响应式对象上添加新属性，因为 `Vue` 无法探测普通的新增属性 (比如 `this.myObject.newProperty = 'hi'`)

- **注意**：对象不能是 `Vue` 实例，或者 `Vue` 实例的根数据对象。

### 2.2 内部原理

还记得我们在介绍数据变化侦测的时候说过，对于`object`型数据，当我们向`object`数据里添加一对新的`key/value`或删除一对已有的`key/value`时，`Vue`是无法观测到的；而对于`Array`型数据，当我们通过数组下标修改数组中的数据时，`Vue`也是是无法观测到的；

正是因为存在这个问题，所以`Vue`设计了`set`和`delete`这两个方法来解决这一问题，下面我们就先来看看`set`方法的内部实现原理。

`set`方法的定义位于源码的`src/core/observer/index.js`中，如下：

```javascript
export function set(target, key, val) {
  if (
    process.env.NODE_ENV !== "production" &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(
      `Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`
    );
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key);
    target.splice(key, 1, val);
    return val;
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val;
    return val;
  }
  const ob = (target: any).__ob__;
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== "production" &&
      warn(
        "Avoid adding reactive properties to a Vue instance or its root $data " +
          "at runtime - declare it upfront in the data option."
      );
    return val;
  }
  if (!ob) {
    target[key] = val;
    return val;
  }
  defineReactive(ob.value, key, val);
  ob.dep.notify();
  return val;
}
```

可以看到，方法内部的逻辑并不复杂，就是根据不同的情况作出不同的处理。

首先判断在非生产环境下如果传入的`target`是否为`undefined`、`null`或是原始类型，如果是，则抛出警告，如下：

```javascript
if (
  process.env.NODE_ENV !== "production" &&
  (isUndef(target) || isPrimitive(target))
) {
  warn(
    `Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`
  );
}
```

接着判断如果传入的`target`是数组并且传入的`key`是有效索引的话，那么就取当前数组长度与`key`这两者的最大值作为数组的新长度，然后使用数组的`splice`方法将传入的索引`key`对应的`val`值添加进数组。这里注意一点，为什么要用`splice`方法呢？还记得我们在介绍`Array`类型数据的变化侦测方式时说过，数组的`splice`方法已经被我们创建的拦截器重写了，也就是说，当使用`splice`方法向数组内添加元素时，该元素会自动被变成响应式的。如下：

```javascript
if (Array.isArray(target) && isValidArrayIndex(key)) {
  target.length = Math.max(target.length, key);
  target.splice(key, 1, val);
  return val;
}
```

如果传入的`target`不是数组，那就当做对象来处理。

首先判断传入的`key`是否已经存在于`target`中，如果存在，表明这次操作不是新增属性，而是对已有的属性进行简单的修改值，那么就只修改属性值即可，如下：

```javascript
if (key in target && !(key in Object.prototype)) {
  target[key] = val;
  return val;
}
```

接下来获取到`target`的`__ob__`属性，我们说过，该属性是否为`true`标志着`target`是否为响应式对象，接着判断如果`tragte`是 `Vue` 实例，或者是 `Vue` 实例的根数据对象，则抛出警告并退出程序，如下：

```javascript
const ob = (target: any).__ob__;
if (target._isVue || (ob && ob.vmCount)) {
  process.env.NODE_ENV !== "production" &&
    warn(
      "Avoid adding reactive properties to a Vue instance or its root $data " +
        "at runtime - declare it upfront in the data option."
    );
  return val;
}
```

接着判断如果`ob`属性为`false`，那么表明`target`不是一个响应式对象，那么我们只需简单给它添加上新的属性，不用将新属性转化成响应式，如下：

```javascript
if (!ob) {
  target[key] = val;
  return val;
}
```

最后，如果`target`是对象，并且是响应式，那么就调用`defineReactive`方法将新属性值添加到`target`上，`defineReactive`方会将新属性添加完之后并将其转化成响应式，最后通知依赖更新，如下：

```javascript
defineReactive(ob.value, key, val);
ob.dep.notify();
```

以上，就是`set`方法的内部原理。其逻辑流程图如下：

![](~@/instanceMethods/1.jpg)

## 3. vm.\$delete

`vm.$delete` 是全局 `Vue.delete`的**别名**，其用法相同。

### 3.1 用法回顾

在介绍方法的内部原理之前，我们先根据官方文档示例回顾一下它的用法。

```javascript
vm.$delete(target, propertyName / index);
```

- **参数**：

  - `{Object | Array} target`
  - `{string | number} propertyName/index`

  > 仅在 2.2.0+ 版本中支持 Array + index 用法。

- **用法**：

  删除对象的属性。如果对象是响应式的，确保删除能触发更新视图。这个方法主要用于避开 `Vue` 不能检测到属性被删除的限制，但是你应该很少会使用它。

  > 在 2.2.0+ 中同样支持在数组上工作。

* **注意**： 目标对象不能是一个 `Vue` 实例或 `Vue` 实例的根数据对象。

### 3.2 内部原理

`delete`方法是用来解决 `Vue` 不能检测到属性被删除的限制，该方法的定义位于源码的`src/core.observer/index.js`中，如下：

```javascript
export function del(target, key) {
  if (
    process.env.NODE_ENV !== "production" &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(
      `Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`
    );
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1);
    return;
  }
  const ob = (target: any).__ob__;
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== "production" &&
      warn(
        "Avoid deleting properties on a Vue instance or its root $data " +
          "- just set it to null."
      );
    return;
  }
  if (!hasOwn(target, key)) {
    return;
  }
  delete target[key];
  if (!ob) {
    return;
  }
  ob.dep.notify();
}
```

该方法的内部原理与`set`方法有几分相似，都是根据不同情况作出不同处理。

首先判断在非生产环境下如果传入的`target`不存在，或者`target`是原始值，则抛出警告，如下：

```javascript
if (
  process.env.NODE_ENV !== "production" &&
  (isUndef(target) || isPrimitive(target))
) {
  warn(
    `Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`
  );
}
```

接着判断如果传入的`target`是数组并且传入的`key`是有效索引的话，就使用数组的`splice`方法将索引`key`对应的值删掉，为什么要用`splice`方法上文中也解释了，就是因为数组的`splice`方法已经被我们创建的拦截器重写了，所以使用该方法会自动通知相关依赖。如下：

```javascript
if (Array.isArray(target) && isValidArrayIndex(key)) {
  target.splice(key, 1);
  return;
}
```

如果传入的`target`不是数组，那就当做对象来处理。

接下来获取到`target`的`__ob__`属性，我们说过，该属性是否为`true`标志着`target`是否为响应式对象，接着判断如果`tragte`是 `Vue` 实例，或者是 `Vue` 实例的根数据对象，则抛出警告并退出程序，如下：

```javascript
const ob = (target: any).__ob__;
if (target._isVue || (ob && ob.vmCount)) {
  process.env.NODE_ENV !== "production" &&
    warn(
      "Avoid adding reactive properties to a Vue instance or its root $data " +
        "at runtime - declare it upfront in the data option."
    );
  return val;
}
```

接着判断传入的`key`是否存在于`target`中，如果`key`本来就不存在于`target`中，那就不用删除，直接退出程序即可，如下：

```javascript
if (!hasOwn(target, key)) {
  return;
}
```

最后，如果`target`是对象，并且传入的`key`也存在于`target`中，那么就从`target`中将该属性删除，同时判断当前的`target`是否为响应式对象，如果是响应式对象，则通知依赖更新；如果不是，删除完后直接返回不通知更新，如下：

```javascript
delete target[key];
if (!ob) {
  return;
}
ob.dep.notify();
```

以上，就是`delete`方法的内部原理。
