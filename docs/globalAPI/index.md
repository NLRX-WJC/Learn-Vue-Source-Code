---
title: 全局API分析
---

## 0. 前言

与实例方法不同，实例方法是将方法挂载到`Vue`的原型上，而全局API是直接在`Vue`上挂载方法。在`Vue`中，全局API一共有12个，分别是`Vue.extend`、`Vue.nextTick`、`Vue.set`、`Vue.delete`、`Vue.directive`、`Vue.filter `、`Vue.component`、`Vue.use`、`Vue.mixin`、`Vue.observable`、`Vue.version`。这12个API中有的是我们在日常业务开发中经常会用到的，有的是对`Vue`内部或外部插件提供的，我们在日常业务开发中几乎用不到。接下来我们就对这12个API逐个进行分析，看看其内部原理都是怎样的。


## 1. Vue.extend

### 1.1 用法回顾

其用法如下：

```javascript
Vue.extend( options )
```

- **参数**：

  - `{Object} options`

- **作用**：

  使用基础 `Vue` 构造器，创建一个“子类”。参数是一个包含组件选项的对象。

  `data` 选项是特例，需要注意 - 在 `Vue.extend()` 中它必须是函数

  ```html
  <div id="mount-point"></div>
  ```

  ```javascript
  // 创建构造器
  var Profile = Vue.extend({
    template: '<p>{{firstName}} {{lastName}} aka {{alias}}</p>',
    data: function () {
      return {
        firstName: 'Walter',
        lastName: 'White',
        alias: 'Heisenberg'
      }
    }
  })
  // 创建 Profile 实例，并挂载到一个元素上。
  new Profile().$mount('##mount-point')
  ```

  结果如下：

  ```html
  <p>Walter White aka Heisenberg</p>
  ```

### 1.2 原理分析

通过用法回顾我们知道，`Vue.extend`的作用是创建一个继承自`Vue`类的子类，可接收的参数是一个包含组件选项的对象。

既然是`Vue`类的子类，那么除了它本身独有的一些属性方法，还有一些是从`Vue`类中继承而来，所以创建子类的过程其实就是一边给子类上添加上独有的属性，一边将父类的公共属性复制到子类上。接下来，我们就来看看源码是如何实现这个过程的。

该API的定义位于源码的`src/core/global-api/extend.js`中，如下：

```javascript
Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    const Super = this
    const SuperId = Super.cid
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    if (cachedCtors[SuperId]) {
        return cachedCtors[SuperId]
    }

    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production' && name) {
        validateComponentName(name)
    }

    const Sub = function VueComponent (options) {
        this._init(options)
    }
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
    Sub.cid = cid++
    Sub.options = mergeOptions(
        Super.options,
        extendOptions
    )
    Sub['super'] = Super

    if (Sub.options.props) {
        initProps(Sub)
    }
    if (Sub.options.computed) {
        initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
        Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    if (name) {
        Sub.options.components[name] = Sub
    }

    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    cachedCtors[SuperId] = Sub
    return Sub
}

```

可以看到，虽然代码量稍微有点多，但是逻辑并不复杂，下面我们就来逐行分析一下。

首先，该函数内部定义了几个变量，如下：

```javascript
extendOptions = extendOptions || {}
const Super = this
const SuperId = Super.cid
const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
```



- extendOptions：用户传入的一个包含组件选项的对象参数；
- Super：指向父类，即基础 `Vue`类；
- SuperId：父类的`cid`属性，无论是基础 `Vue`类还是从基础 `Vue`类继承而来的类，都有一个`cid`属性，作为该类的唯一标识；
- cachedCtors：缓存池，用于缓存创建出来的类；



接着，在缓存池中先尝试获取是否之前已经创建过的该子类，如果之前创建过，则直接返回之前创建的。之所以有这一步，是因为`Vue`为了性能考虑，反复调用`Vue.extend`其实应该返回同一个结果，只要返回结果是固定的，就可以将结果缓存，再次调用时，只需从缓存中取出结果即可。在API方法定义的最后，当创建完子类后，会使用父类的`cid`作为`key`，创建好的子类作为`value`，存入缓存池`cachedCtors`中。如下：

```javascript
if (cachedCtors[SuperId]) {
    return cachedCtors[SuperId]
}
```



接着，获取到传入的选项参数中的`name`字段，并且在开发环境下校验`name`字段是否合法，如下：

```javascript
const name = extendOptions.name || Super.options.name
if (process.env.NODE_ENV !== 'production' && name) {
    validateComponentName(name)
}
```

接着，创建一个类`Sub`，这个类就是将要继承基础`Vue`类的子类，如下：

```javascript
const Sub = function VueComponent (options) {
    this._init(options)
}
```

到这里，我们已经把类创建好了，接下来的工作就是让该类去继承基础`Vue`类，让其具备一些基础`Vue`类的能力。

首先，将父类的原型继承到子类中，并且为子类添加唯一标识`cid`，如下：

```javascript
Sub.prototype = Object.create(Super.prototype)
Sub.prototype.constructor = Sub
Sub.cid = cid++
```

接着，将父类的`options`与子类的`options`进行合并，将合并结果赋给子类的`options`属性，如下：

```javascript
Sub.options = mergeOptions(
    Super.options,
    extendOptions
)
```

接着，将父类保存到子类的`super`属性中，以确保在子类中能够拿到父类，如下：

```javascript
Sub['super'] = Super
```

接着，如果选项中存在`props`属性，则初始化它，如下：

```javascript
if (Sub.options.props) {
    initProps(Sub)
}

function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}
```

初始化`props`属性其实就是把参数中传入的`props`选项代理到原型的`_props`中。

接着，如果选项中存在`computed`属性，则初始化它，如下：

```javascript
if (Sub.options.computed) {
    initComputed(Sub)
}

function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
```

初始化`props`属性就是遍历参数中传入的`computed`选项，将每一项都调用`defineComputed`函数定义到子类原型上。此处的`defineComputed`函数与我们之前在生命周期初始化阶段`initState`中所介绍的`defineComputed`函数是一样的。

接着，将父类中的一些属性复制到子类中，如下：

```javascript
Sub.extend = Super.extend
Sub.mixin = Super.mixin
Sub.use = Super.use

export const ASSET_TYPES = [
  'component',
  'directive',
  'filter'
]
// create asset registers, so extended classes
// can have their private assets too.
ASSET_TYPES.forEach(function (type) {
    Sub[type] = Super[type]
})
// enable recursive self-lookup
if (name) {
    Sub.options.components[name] = Sub
}
```

接着，给子类新增三个独有的属性，如下：

```javascript
Sub.superOptions = Super.options
Sub.extendOptions = extendOptions
Sub.sealedOptions = extend({}, Sub.options)
```

最后，使用父类的`cid`作为`key`，创建好的子类`Sub`作为`value`，存入缓存池`cachedCtors`中。如下：

```javascript
// cache constructor
cachedCtors[SuperId] = Sub
```

最终将创建好的子类`Sub`返回。

以上，就是`Vue.extend`的所有逻辑。其实总体来讲，整个过程就是先创建一个类`Sub`，接着通过原型继承的方式将该类继承基础`Vue`类，然后给`Sub`类添加一些属性以及将父类的某些属性复制到`Sub`类上，最后将`Sub`类返回。

## 2. Vue.nextTick

### 2.1 用法回顾

其用法如下：

```javascript
Vue.nextTick( [callback, context] )
```

- **参数**：

  - `{Function} [callback]`
  - `{Object} [context]`

- **作用**：

  在下次 DOM 更新循环结束之后执行延迟回调。在修改数据之后立即使用这个方法，获取更新后的 DOM。

  ```javascript
  // 修改数据
  vm.msg = 'Hello'
  // DOM 还没有更新
  Vue.nextTick(function () {
    // DOM 更新了
  })

  // 作为一个 Promise 使用 (2.1.0 起新增，详见接下来的提示)
  Vue.nextTick()
    .then(function () {
      // DOM 更新了
    })
  ```

  > 2.1.0 起新增：如果没有提供回调且在支持 Promise 的环境中，则返回一个 Promise。请注意 Vue 不自带 Promise 的 polyfill，所以如果你的目标浏览器不原生支持 Promise (IE：你们都看我干嘛)，你得自己提供 polyfill。

### 2.2 原理分析

该API的原理同实例方法 `$nextTick`原理一样，此处不再重复。唯一不同的是实例方法 `$nextTick` 中回调的 `this` 绑定在调用它的实例上。

## 3. Vue.set

### 3.1 用法回顾

其用法如下：

```javascript
Vue.set( target, propertyName/index, value )
```

- **参数**：

  - `{Object | Array} target`
  - `{string | number} propertyName/index`
  - `{any} value`

- **返回值**：设置的值。

- **作用**：

  向响应式对象中添加一个属性，并确保这个新属性同样是响应式的，且触发视图更新。它必须用于向响应式对象上添加新属性，因为 Vue 无法探测普通的新增属性 (比如 `this.myObject.newProperty = 'hi'`)

### 3.2 原理分析

该API的原理同实例方法 `$set`原理一样，此处不再重复。

## 4. Vue.delete

### 4.1 用法回顾

其用法如下：

```javascript
Vue.delete( target, propertyName/index )
```

- **参数**：

  - `{Object | Array} target`
  - `{string | number} propertyName/index`

  > 仅在 2.2.0+ 版本中支持 Array + index 用法。

- **作用**：

  删除对象的属性。如果对象是响应式的，确保删除能触发更新视图。这个方法主要用于避开 Vue 不能检测到属性被删除的限制，但是你应该很少会使用它。

  > 在 2.2.0+ 中同样支持在数组上工作。



### 4.2 原理分析

该API的原理同实例方法 `$delete`原理一样，此处不再重复。

## 5. Vue.directive

### 5.1 用法回顾

其用法如下：

```javascript
Vue.directive( id, [definition] )
```

- **参数**：

  - `{string} id`
  - `{Function | Object} [definition]`

- **作用**：

  注册或获取全局指令。

  ```javascript
  // 注册
  Vue.directive('my-directive', {
    bind: function () {},
    inserted: function () {},
    update: function () {},
    componentUpdated: function () {},
    unbind: function () {}
  })

  // 注册 (指令函数)
  Vue.directive('my-directive', function () {
    // 这里将会被 `bind` 和 `update` 调用
  })

  // getter，返回已注册的指令
  var myDirective = Vue.directive('my-directive')
  ```

### 5.2 原理分析

从用法回顾中可以知道，该API是用来注册或获取全局指令的，接收两个参数：指令`id`和指令的定义。这里需要注意一点的是：注册指令是将定义好的指令存放在某个位置，获取指令是根据指令`id`从存放指令的位置来读取指令。至于如何让指令生效的问题我们会在指令篇单独展开介绍。

下面我们就来看一下该API的内部实现原理，其代码如下：

```javascript
Vue.options = Object.create(null)
Vue.options['directives'] = Object.create(null)

Vue.directive= function (id,definition) {
    if (!definition) {
        return this.options['directives'][id]
    } else {
        if (type === 'directive' && typeof definition === 'function') {
            definition = { bind: definition, update: definition }
        }
        this.options['directives'][id] = definition
        return definition
    }
}
```

可以看到，我们在`Vue`类上创建了`options`属性，其属性值为一个空对象，并且在`options`属性中添加了`directives`属性，其值也是一个空对象，这个`directives`属性就是用来存放指令的位置。如下：

```javascript
Vue.options = Object.create(null)
Vue.options['directives'] = Object.create(null)
```



前文我们说了，该API可以用来注册或获取全局指令，这两种功能的切换取决于是否传入了`definition`参数。如果没有传入`definition`参数，则表示为获取指令，那么就从存放指令的地方根据指令`id`来读取指令并返回，如下：

```javascript
if (!definition) {
    return this.options['directives'][id]
}
```

如果传入了`definition`参数，则表示为注册指令，那么继续判断`definition`参数是否是一个函数，如果是函数，则默认监听`bind`和`update`两个事件，即将`definition`函数分别赋给`bind`和`update`两个属性。如下：

```javascript
if (type === 'directive' && typeof definition === 'function') {
    definition = { bind: definition, update: definition }
}
```

如果`definition`参数不是一个函数，那么即认为它是用户自定义的指令对象，直接将其保存在`this.options['directives']`中，如下：

```javascript
this.options['directives'][id] = definition
```

以上，就是`Vue.directives`的所有逻辑。

## 6. Vue.filter

### 6.1 用法回顾

其用法如下：

```javascript
Vue.filter( id, [definition] )
```

- **参数**：

  - `{string} id`
  - `{Function} [definition]`

- **作用**：

  注册或获取全局过滤器。

  ``` javascript
  // 注册
  Vue.filter('my-filter', function (value) {
    // 返回处理后的值
  })

  // getter，返回已注册的过滤器
  var myFilter = Vue.filter('my-filter')
  ```

### 6.2 原理分析

从用法回顾中可以知道，该API是用来注册或获取全局过滤器的，接收两个参数：过滤器`id`和过滤器的定义。同全局指令一样，注册过滤器是将定义好的过滤器存放在某个位置，获取过滤器是根据过滤器`id`从存放过滤器的位置来读取过滤器。至于如何让过滤器生效的问题我们会在过滤器篇单独展开介绍。

下面我们就来看一下该API的内部实现原理，其代码如下：

```javascript
Vue.options = Object.create(null)
Vue.options['filters'] = Object.create(null)

Vue.filter= function (id,definition) {
    if (!definition) {
        return this.options['filters'][id]
    } else {
        this.options['filters'][id] = definition
        return definition
    }
}
```

可以看到，同全局指令一样，`Vue.options['filters']`是用来存放全局过滤器的地方。还是根据是否传入了`definition`参数来决定本次操作是注册过滤器还是获取过滤器。如果没有传入`definition`参数，则表示本次操作为获取过滤器，那么就从存放过滤器的地方根据过滤器`id`来读取过滤器并返回；如果传入了`definition`参数，则表示本次操作为注册过滤器，那就直接将其保存在`this.options['filters']`中。



## 7. Vue.component

### 7.1 用法回顾

其用法如下：

```javascript
Vue.component( id, [definition] )
```

- **参数**：

  - `{string} id`
  - `{Function | Object} [definition]`

- **作用**：

  注册或获取全局组件。注册还会自动使用给定的`id`设置组件的名称

  ```javascript
  // 注册组件，传入一个扩展过的构造器
  Vue.component('my-component', Vue.extend({ /* ... */ }))

  // 注册组件，传入一个选项对象 (自动调用 Vue.extend)
  Vue.component('my-component', { /* ... */ })

  // 获取注册的组件 (始终返回构造器)
  var MyComponent = Vue.component('my-component')
  ```

### 7.2 原理分析

从用法回顾中可以知道，该API是用来注册或获取全局组件的，接收两个参数：组件`id`和组件的定义。 同全局指令一样，注册全局组件是将定义好的组件存放在某个位置，获取组件是根据组件`id`从存放组件的位置来读取组件。

下面我们就来看一下该API的内部实现原理，其代码如下：

```javascript
Vue.options = Object.create(null)
Vue.options['components'] = Object.create(null)

Vue.filter= function (id,definition) {
    if (!definition) {
        return this.options['components'][id]
    } else {
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
            validateComponentName(id)
        }
        if (type === 'component' && isPlainObject(definition)) {
            definition.name = definition.name || id
            definition = this.options._base.extend(definition)
        }
        this.options['components'][id] = definition
        return definition
    }
}
```

可以看到，同全局指令一样，`Vue.options['components']`是用来存放全局组件的地方。还是根据是否传入了`definition`参数来决定本次操作是注册组件还是获取组件。如果没有传入`definition`参数，则表示本次操作为获取组件，那么就从存放组件的地方根据组件`id`来读取组件并返回；如果传入了`definition`参数，则表示本次操作为注册组件，如果是注册组件，那么在非生产环境下首先会校验组件的`name`值是否合法，如下：

```javascript
if (process.env.NODE_ENV !== 'production' && type === 'component') {
    validateComponentName(id)
}
```

接着，判断传入的`definition`参数是否是一个对象，如果是对象，则使用`Vue.extend`方法将其变为`Vue`的子类，同时如果`definition`对象中不存在`name`属性时，则使用组件`id`作为组件的`name`属性。如下：

```javascript
if (type === 'component' && isPlainObject(definition)) {
    definition.name = definition.name || id
    definition = this.options._base.extend(definition)
}
```

最后，将注册好的组件保存在`this.options['components']`中。

## 8 directive、filter、component小结

通过对`Vue.directive`、`Vue.filter`和`Vue.component`这三个API的分析，细心的你肯定会发现这三个API的代码实现非常的相似，是的，这是我们为了便于理解故意拆开的，其实在源码中这三个API的实现是写在一起的，位于源码的`src/core/global-api/index,js`和`src/core/global-api/assets,js`中，如下：

```javascript
export const ASSET_TYPES = [
  'component',
  'directive',
  'filter'
]

Vue.options = Object.create(null)
ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
})

ASSET_TYPES.forEach(type => {
    Vue[type] = function (id,definition) {
        if (!definition) {
            return this.options[type + 's'][id]
        } else {
            if (process.env.NODE_ENV !== 'production' && type === 'component') {
                validateComponentName(id)
            }
            if (type === 'component' && isPlainObject(definition)) {
                definition.name = definition.name || id
                definition = this.options._base.extend(definition)
            }
            if (type === 'directive' && typeof definition === 'function') {
                definition = { bind: definition, update: definition }
            }
            this.options[type + 's'][id] = definition
            return definition
        }
    }
})
```

## 9. Vue.use

### 9.1 用法回顾

其用法如下：

```javascript
Vue.use( plugin )
```

- **参数**：

  - `{Object | Function} plugin`

- **作用**：

  安装 Vue.js 插件。如果插件是一个对象，必须提供 `install` 方法。如果插件是一个函数，它会被作为 install 方法。install 方法调用时，会将 `Vue` 作为参数传入。

  该方法需要在调用 `new Vue()` 之前被调用。

  当 `install` 方法被同一个插件多次调用，插件将只会被安装一次。



### 9.2 原理分析

从用法回顾中可以知道，该API是用来安装`Vue.js`插件的。并且我们知道了，该API内部会调用插件提供的`install` 方法，同时将`Vue` 作为参数传入。另外，由于插件只会被安装一次，所以该API内部还应该防止 `install` 方法被同一个插件多次调用。下面我们就来看一下该API的内部实现原理。

该API的定义位于源码的`src/core/global-api/use.js`中，代码如下：

```javascript
Vue.use = function (plugin) {
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    if (installedPlugins.indexOf(plugin) > -1) {
        return this
    }

    // additional parameters
    const args = toArray(arguments, 1)
    args.unshift(this)
    if (typeof plugin.install === 'function') {
        plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
        plugin.apply(null, args)
    }
    installedPlugins.push(plugin)
    return this
}
```

可以看到，在该函数内部，首先定义了一个变量`installedPlugins`,该变量初始值是一个空数组，用来存储已安装过的插件。首先判断传入的插件是否存在于`installedPlugins`数组中（即已被安装过），如果存在的话，则直接返回，防止重复安装。如下：

```javascript
const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
if (installedPlugins.indexOf(plugin) > -1) {
    return this
}
```

接下来获取到传入的其余参数，并且使用`toArray`方法将其转换成数组，同时将`Vue`插入到该数组的第一个位置，这是因为在后续调用`install`方法时，`Vue`必须作为第一个参数传入。如下：

```javascript
const args = toArray(arguments, 1)
args.unshift(this)
```

在用法回顾中说了，传入的插件可以是一个提供了 `install` 方法的对象。也可以是一个函数，那么这个函数会被作为 install 方法。所以在接下来会根据这两种不同的情况分别处理。

首先，判断传入的插件如果是一个提供了 `install` 方法的对象，那么就执行该对象中提供的 `install` 方法并传入参数完成插件安装。如下：

```javascript
if (typeof plugin.install === 'function') {
    plugin.install.apply(plugin, args)
}
```

如果传入的插件是一个函数，那么就把这个函数当作`install`方法执行，同时传入参数完成插件安装。如下：

```javascript
else if (typeof plugin === 'function') {
    plugin.apply(null, args)
}
```

插件安装完成之后，将该插件添加进已安装插件列表中，防止重复安装。如下：

```javascript
installedPlugins.push(plugin)
```

以上，就是`Vue.use`的所有逻辑。

## 10. Vue.mixin

### 10.1 用法回顾

其用法如下：

```javascript
Vue.mixin( mixin )
```

- **参数**：

  - `{Object} mixin`

- **作用**：

  全局注册一个混入，影响注册之后所有创建的每个 Vue 实例。插件作者可以使用混入，向组件注入自定义的行为。**不推荐在应用代码中使用**。



### 10.2 原理分析

从用法回顾中可以知道，该API是用来向全局注册一个混入，即可以修改`Vue.options`属性，并且会影响之后的所有`Vue`实例，这个API虽然在日常的业务开发中几乎用不到，但是在编写`Vue`插件时用处非常大。下面我们就来看一下该API的内部实现原理。

该API的定义位于源码的`src/core/global-api/mixin.js`中，代码如下：

```javascript
Vue.mixin = function (mixin: Object) {
    this.options = mergeOptions(this.options, mixin)
    return this
}
```

可以看到，该API的实现非常简单。因为上文中我们说了，该API就是通过修改`Vue.options`属性进而影响之后的所有`Vue`实例。所以我们只需将传入的`mixin`对象与`this.options`合并即可，然后将合并后的新对象作为`this.options`传给之后的所有`Vue`实例，从而达到改变其原有特性的效果。

## 11. Vue.compile

### 11.1 用法回顾

其用法如下：

```javascript
Vue.compile( template )
```

- **参数**：

  - `{string} template`

- **作用**：

  在 render 函数中编译模板字符串。**只在独立构建时有效**

  ```javascript
  var res = Vue.compile('<div><span>{{ msg }}</span></div>')

  new Vue({
    data: {
      msg: 'hello'
    },
    render: res.render,
    staticRenderFns: res.staticRenderFns
  })
  ```


### 11.2 原理分析

从用法回顾中可以知道，该API是用来编译模板字符串的，我们在日常业务开发中几乎用不到，它内部是调用了`compileToFunctions`方法，如下：

```javascript
Vue.compile = compileToFunctions;
```

关于`compileToFunctions`方法在**模板编译篇**已经做了非常详细的介绍，此处不再重复。

## 12. Vue.observable

### 12.1 用法回顾

其用法如下：

```javascript
Vue.observable( object )
```

- **参数**：

  - `{Object} object`

- **用法**：

  让一个对象可响应。Vue 内部会用它来处理 `data` 函数返回的对象。

  返回的对象可以直接用于[渲染函数](https://cn.vuejs.org/v2/guide/render-function.html)和[计算属性](https://cn.vuejs.org/v2/guide/computed.html)内，并且会在发生改变时触发相应的更新。也可以作为最小化的跨组件状态存储器，用于简单的场景：

  ```javascript
  const state = Vue.observable({ count: 0 })

  const Demo = {
    render(h) {
      return h('button', {
        on: { click: () => { state.count++ }}
      }, `count is: ${state.count}`)
    }
  }
  ```

### 12.2 原理分析

从用法回顾中可以知道，该API是用来将一个普通对象转化成响应式对象。在日常业务开发中也几乎用不到，它内部是调用了`observe`方法，关于该方法在**数据变化侦测篇**已经做了非常详细的介绍，此处不再重复。


## 13. Vue.version

### 13.1 用法回顾

其用法如下：

```javascript
Vue.version
```

- **细节**：提供字符串形式的 Vue 安装版本号。这对社区的插件和组件来说非常有用，你可以根据不同的版本号采取不同的策略。

- **用法**：

  ```javascript
  var version = Number(Vue.version.split('.')[0])

  if (version === 2) {
    // Vue v2.x.x
  } else if (version === 1) {
    // Vue v1.x.x
  } else {
    // Unsupported versions of Vue
  }
  ```

### 13.2 原理分析

从用法回顾中可以知道，该API是用来标识当前构建的`Vue.js`的版本号，对于日常业务开发几乎用不到，但是对于插件编写非常有用，可以根据`Vue`版本的不同从而做一些不同的事情。

该API是在构建时读取了`package.json`中的`version`字段，然后将其赋值给`Vue.version`。

