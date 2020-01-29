const compileHandle = {
    text(node,expr,vm){
        let val
        if(expr.includes("{")){ // 判断是否为文本节点的修改
            val = expr.replace(/\{\{(.+?)\}\}/g,(...args)=>{ // 找到所有的{{}}，将{{}}内的内容做为一个分组来替换
                new Watcher(vm,args[1],(newVal=>{
                    this.updater.textUpdate(node,this.getContentVal(expr,vm))
                }))
                return this.getVal(args[1],vm); // 这里的args[1]就是我们要的每个{{}}内的值
            })
        }else{ 
            val = this.getVal(expr,vm)
            new Watcher(vm,expr,(newVal=>{
                this.updater.textUpdate(node,newVal)
            }))
        }
        this.updater.textUpdate(node,val)
    },
    html(node,expr,vm){
        const val = this.getVal(expr,vm)
        new Watcher(vm,expr,(newVal=>{
            this.updater.htmlUpdate(node,newVal)
        }))
        this.updater.htmlUpdate(node,val)
    },
    model(node,expr,vm){
        const val = this.getVal(expr,vm)
        new Watcher(vm,expr,(newVal=>{
            this.updater.modelUpdate(node,newVal)
        }))
        node.addEventListener("input",e=>{ // 监听表单元素
            this.setVal(expr,vm,e.target.value) // 设置新值
        })
        this.updater.modelUpdate(node,val)
    },
    if(node,expr,vm){
        
    },
    show(node,expr,vm){
        const val = this.getVal(expr,vm);
        new Watcher(vm,expr,(newVal=>{
            this.updater.showUpdate(node,newVal)
        }))
        this.updater.showUpdate(node,val);
    },
    for(node,expr,vm){

    },
    key(node,expr,vm){

    },
    bind(node,expr,vm,bindType){

    },
    on(node,expr,vm,bindType){
        let fn = vm.$options.methods&&vm.$options.methods[expr]; // 将函数赋值给fn
        node.addEventListener(bindType,fn.bind(vm),false); // 使用bind将this绑定到vue实例中
    },
    getContentVal(expr,vm){
        return expr.replace(/\{\{(.+?)\}\}/g,(...args)=>{ // 找到所有的{{}}，将{{}}内的内容做为一个分组来替换
            return this.getVal(args[1],vm); // 这里的args[1]就是我们要的每个{{}}内的值
        })
    },
    updater:{
        textUpdate(node,value){
            node.textContent = value
        },
        htmlUpdate(node,value){
            node.innerHTML = value
        },
        modelUpdate(node,value){
            node.value = value
        },
        showUpdate(node,value){
            if(value){
                node.style.display="block"
            }else{
                
                node.style.display="none"
            }
        }
    },
    getVal(expr,vm){
        return expr.split(".").reduce((data,attr)=>{
            return data[attr];
        },vm.$data)
    },
    setVal(expr,vm,newVal){
        expr.split(".").reduce((data,attr)=>{
            data[attr] = newVal;
        },vm.$data)
    }
}

class Watcher{
    constructor(vm,expr,cb){
        this.vm = vm;
        this.expr = expr;
        this.cb = cb;
        this.oldVal = this.getOldVal()
    }
    update(){
        const newVal = compileHandle.getVal(this.expr,this.vm);
        if(newVal!==this.oldVal){ // 如果新值与旧值不同
            this.cb(newVal) // 调用回调函数
            this.oldVal = newVal // 替换旧值
        }
    }
    getOldVal(){
        Dep.target = this; // 挂载到Dep.target上
        const oldVal = compileHandle.getVal(this.expr,this.vm);
        Dep.target = null; // 将target.target置为null
        return oldVal
    }
}

class Dep{
    constructor(){
        this.subs = []; // 初始化依赖收集列表
    }
    addSub(watcher){ // 添加观察者
        this.subs.push(watcher);
    }
    notify(){ // 通知列表中的所有观察者触发更新
        this.subs.forEach(w=>w.update());
    }
}

class Compile{
    constructor(el,vm){
        this.el = this.isElement(el) ? el : document.querySelector(el);
        this.vm = vm;
        // 将获取入口节点元素的子孙节点放入到文档碎片中
        const frag = this.transformToFrag(this.el);
        // 编译文档碎片中的子孙节点
        this.compile(frag);
        // 将编译好的文档碎片插入到入口元素节点
        this.el.appendChild(frag);
    }
    compile(frag){
        // 获取文档碎片的子元素
        const childNodes = frag.childNodes;
        // 这里的childNodes就是一个NodeList数组NodeList(9) [text, h1, text, ul, text, p, text, input, text]
        // 使用...运算符来处理childNodes将其变为一个数组
        [...childNodes].forEach(node=>{
            if(this.isElement(node)){ // 判断为元素节点
                // 对元素节点的编译操作
                this.compileElement(node);
            }else{ // 文本节点
                // 对文本节点的编译操作
                this.compileText(node);
            }
            if(node.childNodes){
                this.compile(node);
            }
        })
    }
    compileElement(node){
        const attrs = node.attributes;
        [...attrs].forEach(attr=>{ // attr是object类型
            let {name,value} = attr;
            if(this.isVueElement(name)){
                if(name.startsWith(":"))
                    name = "v-bind"+name;
                else if(name.startsWith("@")){
                    name = "v-on:"+name.slice(1);
                }
                const [,instructions] = name.split("-"); // 将指令如text，bind:type，on:click赋值给instructions
                const [type,bindType] = instructions.split(":"); // 将text，on，bind之类的值给type，bind，on绑定的值给bindType
                compileHandle[type](node,value,this.vm,bindType);
                node.removeAttribute(name); // 删除v-指令
            }
        })
    }
    compileText(node){
        const text = node.textContent;
        if(/\{\{.+?\}\}/g.test(text)){
            compileHandle.text(node,text,this.vm)
        }
    }
    isVueElement(name){ // 判断一个属性是否为要处理的属性
       return name.startsWith("v-")||name.startsWith(":")||name.startsWith("@")
    }
    isElement(node){ // 判断是否为一个节点对象
        return node.nodeType === 1;
    }
    transformToFrag(node){
        // 创建文档碎片
        const frag = document.createDocumentFragment();
        // 将节点依次放入到文档碎片中
        let firstChild = node.firstChild; // 取出开头的节点
        while(firstChild){ // 判断是否还有子孙节点
            frag.appendChild(firstChild);
            firstChild = node.firstChild;
        }
        return frag;
    }
}

class Observer{
    constructor(data,vm){
        vm.$data = this.observe(data);
    }
    observe(data){
        if(data && typeof data === "object"){
            Object.keys(data).forEach(key=>{ // 使用Object.keys获取当前一层的属性名
                this.defineReactive(data,key,data[key]); // 对data的key属性进行监听
            })
        }
        return data;
    }
    defineReactive(data,key,val){
        this.observe(val); // 递归遍历
        const dep = new Dep();
        Object.defineProperty(data,key,{
            get:()=>{
                // 判断Dep.target是否有值
                // 若有，将挂载在Dep上的watcher添加到dep的依赖列表中
                Dep.target && dep.addSub(Dep.target); 
                return val
            },
            set:(newVal)=>{
                if(newVal!==val){
                    this.observe(newVal); // 对传入的新值进行监听
                    val = newVal
                }
                dep.notify(); // 通知dep的依赖列表中的watcher触发更新
            }
        })
    }
}

class Vue{
    constructor(options){
        this.$el = options.el;
        this.$data = options.data;
        this.$options = options;
        if(this.$el){ // 判断el是否存在
            // 实现一个观察者
            new Observer(this.$data,this);
            // 实现一个指令解析器
            new Compile(this.$el,this);
        }
    }
}