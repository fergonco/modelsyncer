(function() {
    let root = {};
    let listeners = {};
    let behaviors = {};

    function getSubmodel(root, parts) {
        let point = root;
        for(let i = 0; i < parts.length - 1; i++) {
            let pathPart = parts[i];
            if (!point.hasOwnProperty(pathPart)) {
                point[pathPart] = {};
            }
            point = point[pathPart];
        }
        return point;
    }

    function getExpression(element, attributeName) {
        return element.getAttribute(attributeName)
            .replace(/\$this/g, "target")
            .replace(/\$item/g, "item")
            .replace(/\$value/g, "value")
            .replace(/\$model/g, "root");
    }

    function applySyncDeep(element, value, index) {
        applySync("childsync", element, element, value, index);
        for(let i = 0; i < element.children.length; i++) {
            applySyncDeep(element.children[i], value, i);
        }
    }

    function applySync(prefix, propertyOwner, target, value, index) {
        let normalPrefix = prefix + ":";
        let stylePrefix = prefix + "style:";
        let item = {
            value: value,
            index: index
        };
        if (index >=0 && propertyOwner.hasAttribute(normalPrefix + "tmp")) {
            target.tmp = eval(getExpression(propertyOwner, normalPrefix + "tmp"));
        }
        if (propertyOwner.hasAttribute(normalPrefix + "text")) {
            target.innerHTML = eval(getExpression(propertyOwner, normalPrefix + "text"));
        }
        if (propertyOwner.hasAttribute(normalPrefix + "href")) {
            target.href = eval(getExpression(propertyOwner, normalPrefix + "href"));
        }
        if (propertyOwner.hasAttribute(normalPrefix + "title")) {
            target.title = eval(getExpression(propertyOwner, normalPrefix + "title"));
        }
        if (propertyOwner.hasAttribute(normalPrefix + "src")) {
            target.src = eval(getExpression(propertyOwner, normalPrefix + "src"));
        }
        if (propertyOwner.hasAttribute(normalPrefix + "disabled")) {
            target.disabled = eval(getExpression(propertyOwner, normalPrefix + "disabled"));
        }
        if (propertyOwner.hasAttribute(normalPrefix + "style")) {
            target.style = eval(getExpression(propertyOwner, normalPrefix + "style"));
        }
        if (propertyOwner.hasAttribute(normalPrefix + "value")) {
            target.value = eval(getExpression(propertyOwner, normalPrefix + "value"));
        }
        if (propertyOwner.hasAttribute(normalPrefix + "checked")) {
            target.checked = eval(getExpression(propertyOwner, normalPrefix + "checked"));
        }
        if (propertyOwner.hasAttribute(normalPrefix + "className")) {
            target.className = eval(getExpression(propertyOwner, normalPrefix + "className"));
        }
        if (propertyOwner.hasAttribute(normalPrefix + "scrollTop")) {
            target.scrollTop = eval(getExpression(propertyOwner, normalPrefix + "scrollTop"));
        }
        if (propertyOwner.hasAttribute(normalPrefix + "placeholder")) {
            target.placeholder = eval(getExpression(propertyOwner, normalPrefix + "placeholder"));
        }
        if (propertyOwner.hasAttribute(stylePrefix + "display")) {
            target.style.display = eval(getExpression(propertyOwner, stylePrefix + "display"));
        }
        if (propertyOwner.hasAttribute(stylePrefix + "visibility")) {
            target.style.visibility = eval(getExpression(propertyOwner, stylePrefix + "visibility"));
        }
        if (propertyOwner.hasAttribute(stylePrefix + "toggleClass") && propertyOwner.hasAttribute(stylePrefix + "className")) {
            let className = propertyOwner.getAttribute(stylePrefix + "className");
            if (eval(getExpression(propertyOwner, stylePrefix + "toggleclass")) === true) {
                target.classList.add(className);
            } else {
                target.classList.remove(className);
            }
        }
        if (propertyOwner.hasAttribute(normalPrefix + "children")) {
            let template = null;
            // Remove all elements except the template
            if (propertyOwner.hasAttribute(normalPrefix + "replace")) {
                template = target;
                target = target.parentElement;
            } else {
                template = target.firstElementChild;
            }
            while (template.nextSibling) {
                target.removeChild(template.nextSibling);
            }

            let lastInsert = template;
            if (value instanceof Array) {
                for (let i = 0; i < value.length; i++) {
                    let child = template.cloneNode(true);
                    child.style.display = '';
                    applySyncDeep(child, value[i], i);
                    target.insertBefore(child, lastInsert.nextSibling);
                }

                if (propertyOwner.hasAttribute(normalPrefix + "behaviors")) {
                    let syncBehaviors = propertyOwner.getAttribute(normalPrefix + "behaviors");
                    let behaviorNames = syncBehaviors.split(",");
                    for (let i =0; i < behaviorNames.length; i++) {
                        behaviors[behaviorNames[i]](target);
                    }
                }
            }
        }

    }

    function createListener(propertyOwner, element) {
        return function(value){
            applySync("sync", propertyOwner, element, value);
        };
    }

    let updateModel = function(path, component, expression) {
        doSet(path, function(previousValue) {
            expression = expression.replace(/\$this/g, "component");
            expression = expression.replace(/\$value/g, "previousValue");
            expression = expression.replace(/\$model/g, "root");
            return eval(expression);
        }, false);
    };
    function process(element, firstExecution) {
        let all = element.querySelectorAll("[sync\\:path]");
        let initializing = [];
        for (let i = 0; i < all.length; i++) {
            let element = all[i];
            let target = element;
            while (target.hasAttribute("sync:next")) {
                target = target.nextElementSibling;
            }
            let callback = createListener(element, target);
            let path = element.getAttribute("sync:path");
            listen(path, callback);

            if (element.hasAttribute("sync:output")) {
                let eventName = element.getAttribute("sync:on");
                element.addEventListener(eventName, function() {
                    updateModel(path, element, element.getAttribute("sync:output"));
                });
            }
            if (element.hasAttribute("sync:init")) {
                initializing.push(element);
            }
        }
        for (let i = 0; i < initializing.length; i++) {
            let element = initializing[i];
            let path = element.getAttribute("sync:path");
            let initExpression = element.hasAttribute("sync:init")? element.getAttribute("sync:init") : element.getAttribute("sync:output");
            updateModel(path, element, initExpression);
        }
    }
    process(document.documentElement);

    function touch(path) {
        let value = get(path);
        if (value == null) {
            value = 0;
        }
        set(path, value + 1);
    }

    function update(path, value) {
        doSet(path, function(currentValue) { 
            let expression = value.replace(/\$value/g, currentValue);
            return eval(expression);
        });
    }

    function merge(path, value) {
        doSet(path, function(currentValue) { return value; }, true);
    }

    function set(path, value) {
        doSet(path, function(currentValue) { return value; }, false);
    }

    function mergeOnFirst(o1, o2) {
        for(attribute in o2) {
            if (o2[attribute].constructor == Object && o1.hasOwnProperty(attribute) && o1[attribute].constructor == Object) {
                mergeOnFirst(o1[attribute], o2[attribute]);
            } else {
                o1[attribute] = o2[attribute];
            }
        }
    }
    function doSet(path, valueGetter, merge) {
        let parts = path.split(".");
        let parent = getSubmodel(root, parts);
        let propertyName = parts[parts.length - 1];
        let previousValue = parent[propertyName];
        let newValue = valueGetter(previousValue);
        if (typeof previousValue == "undefined" || newValue != previousValue) {
            if (merge) {
                mergeOnFirst(parent[propertyName], newValue);
            } else {
                parent[propertyName] = newValue;
            }
            let callbacks = listeners[path];
            if (callbacks) {
                // Notify children of this property, already registered as listeners
                for(let j = 0; j < callbacks.length; j++) {
                    let value = parent[propertyName];
                    let relativePath = callbacks[j].relativePath;
                    if (relativePath != null) {
                        let parts = relativePath.split(".");
                        for(let k = 0; k < parts.length; k++) {
                            value = value != null && value != undefined? value[parts[k]]:undefined;
                        }
                    }
                    callbacks[j].callback(value);
                }
                notifyParents(parts);
            }
        }
        console.log(path + ": " + previousValue + "->" + newValue);
    }

    function notifyParents(parts) {
        let value = root;
        let path = "";
        let separator = "";
        for (let i = 0; i < parts.length - 1; i++) {
            value = value[parts[i]];
            path = path + separator + parts[i];
            separator = ".";
            let callbacks = listeners[path];
            for(let i = 0; i < callbacks.length; i++) {
                if (callbacks[i].relativePath == null) {
                    callbacks[i].callback(value);
                }
            }
        }
    }

    function get(path, value) {
        let parts = path.split(".");
        let parent = getSubmodel(root, parts);
        if (parent != null) {
            let propertyName = parts[parts.length - 1];
            return parent[propertyName];
        } else {
            return undefined;
        }
    }

    function listen(path, callback) {
        let parts = path.split(".");
        let incrementalPath = "";
        let separator = "";
        for(let i = 0; i < parts.length; i++) {
            incrementalPath += separator + parts[i];
            separator = ".";
            let relativePath = null;
            if (incrementalPath != path) {
                relativePath = path.substring(incrementalPath.length + 1);
            }
            addListener(incrementalPath, relativePath, callback);
        }
    }

    function addListener(path, callbackRelativePath, callback) {
        if (!listeners.hasOwnProperty(path)) {
            listeners[path] = [];
        }
        let callbacks = listeners[path];
        callbacks.push({
            relativePath: callbackRelativePath,
            callback: callback
        });
    }

    function removeListener(path, callback) {
        let parts = path.split(".");
        let incrementalPath = "";
        let separator = "";
        for(let i = 0; i < parts.length; i++) {
            incrementalPath += separator + parts[i];
            separator = ".";
            let callbacks = listeners[incrementalPath]
            let index = callbacks.findIndex(function(testCallback){
                return testCallback.callback == callback;
            });
            if (index != -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    function registerBehavior(name, behavior) {
        behaviors[name] = behavior;
    }

    registerBehavior("syncer", process);

    di["syncer"] = {
        merge:merge,
        set:set,
        update:update,
        touch:touch,
        get:get,
        listen:listen,
        removeListener:removeListener,
        registerBehavior:registerBehavior
    }
//    export {
//        merge,
//        set,
//        update,
//        touch,
//        get,
//        listen,
//        removeListener,
//        registerBehavior
//    };
})();
