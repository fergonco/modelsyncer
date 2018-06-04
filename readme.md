# ModelSyncer

ModelSyncer dynamizes your HTML by embeding attributes in the DOM elements. These attributes define listeners to changes in the component itself to modify a data tree or viceversa.

These attributes have the form:

    *(child)?sync(style)?:<attribute>*.

The main attribute is:

* sync:path: Defines the path in the data tree that this element is listening or modifying. The value at that path in the data tree can be refered as *$value* in the other attributes. Whenever the values at the defined path changes, all the DOM related attributes get evaluated.

# DOM related attributes

The following attributes modify the corresponding attribute in the target DOM element

* sync:text
* sync:href
* sync:title
* sync:src
* sync:disabled
* sync:style
* sync:value
* sync:checked
* sync:className
* sync:scrollTop
* sync:placeholder
* sync:children
* synctyle:display
* synctyle:visibility

The following two attributes have a slightly more complex logic than a direct assignment:

* synctyle:toggleClass: evaluates to a boolean. If true, the class specified by *syncstyle:className* will be added to the element.
* synctyle:className: class to be added to the element if *syncstyle:toggleClass* evaluates to true.

## Write attributes

* output: Defines the value to set on the path specified by *sync:path* when the event in *sync:on* takes place.
* on: Defines the event that triggers evaluating *sync:output* and setting the result in the data tree.

## Children

The property *sync:children* generates so many elements as elements are in the array it evaluates to.

The children of the element the *sync:children* property targets can use all the previous attributes as any other element. If that's the case, the *sync:behavior* attribute has to be defined:

* sync:behavior: Specifies the "behaviors" that has to be invoked on the generated items. "process" is the name for the ModelSyncer.

        sync:behaviors="process"

If some attribute has to be set at the moment of generation, it is possible to use a "child" prefix:

    <image childsync:src="..." childsyncstyle:toggleClass="$item.index % 2 == 0" childsyncstyle:className="evenclass"></image>

The childsync attributes are evaluated only at generation time, this is, when in the data tree, the value pointed by the sync:path of the element having the *sync:children* attribute is changed.

If only *childsync* attributes are used it is not necessary to include a *sync:path* attribute and *$value will refer to the data element being used to generate the DOM element.

## Sync expressions

The values of *sync* attributes can use these variables:

* $this. The DOM element target of this expression.
* $value. The value specified by *sync:path*.
* $item. In case of child generation (*sync:children*) it contains two properties: *$item.value* points to the value being used to create the DOM element and *$item.index* is the index of the child.
* $model. Root of the model. Useful to reference data outside the specified *sync:path*.


