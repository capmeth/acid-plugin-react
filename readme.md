
# React Plugin for ACID

Use this to document and render React components on the ACID platform.

Typescript is not (yet) supported.


## Install

As a dev dependency:

```
npm install @captison/acid-plugin-react --save-dev
```


## Usage

Add as an extension.

```js
import acid from '@captison/acid'
import acidReact from '@captison/acid-plugin-react'

let docsite = acid();
docsite.use(acidReact);
```

Parser and renderer records will be applied to the ACID configuration automatically.

Parser and renderer are also manually accessible.

```js
import acidReactParser from '@captison/acid-plugin-react/parser'
import acidReactRenderer from '@captison/acid-plugin-react/renderer'
```


## Config

Here are the config options with their defaults.

```js
docsite.use(acidReact, 
{
    // source file types for parsing
    exts: '.jsx',
    // language types for code blocks
    types: [ 'jsx', 'react' ],
    // module specifier for the renderer (added to importmap)
    specifier: 'react-render',
    // output file name for the renderer
    filename: 'acid-react-render.js'
});
```

The parser and renderer extensions themselves do not have config parameters nor do they orient themselves based on language type.


## Parsing Notes

This plugin scans source files as best it can to find component details for documentation.  As such it has some expectations for how code and comments should be organized in order to work properly.

- Only one component should be defined per source file, provided via `export default`.
- Only JsDoc-style block comments are included (i.e. opening with `/**`).
- The component's comment is assumed to be directly above the `export default` statement.  Failing that, the comment having a `@component` tag will be used if it exists.

For component props not documented within the component comment...

- Props are expected to be defined within an object named "propTypes".
- `PropTypes` must literally appear within the type assignment for each prop.
- A prop's comment is assumed to be directly above its definition.

Check the ACID docs for what gets documented from the comment blocks.

In order for this plugin to determine the name of a component the `export default` statement must one of
- an identifier
- a named function declaration
- a class declaration
- a variable declaration

If `export default` is a function call or some other exotic mechanism, a name for the component will **not** be provided to ACID (see ACID docs for how this is handled).


## Rendering Notes

React and ReactDOM are added using the importmap.

```json
{
    "imports":
    {
        "react": "https://esm.sh/react@19",
        "react-dom/client": "https://esm.sh/react-dom@19/client"
    }
}
```

Babel standalone is also pulled into the page (as global "Babel" var).

This plugin supports imports for CoBE renderer records.  React and the configured imports are injected into code blocks.

```js
`
    import React from 'react'
    ${imports}
`
```

If you need to, for instance, import hooks or set the default rendering mode, you can merge additional settings with matching `types` record(s) in the config.

```js label="acid.config.js"
cobe: { types: [ 'jsx', 'react' ], imports: { react: /^use/ }, mode: 'edit' }
```

See the ACID config docs for more details on how the `cobe` setting works.

If a markdown code block starts with `import` or `export` it is assumed to be a complete ESM module with an `export default` that provides the custom component.

````md
```jsx
export default function ()
{
    let [ value, setValue ] = useState(false);

    return (
        <label>
          <Checkbox value={value} onChange={setValue} /> 
          { value ? 'Checked' : 'Unchecked' }.
        </label>
    );
}
```
````

Otherwise, the code is assumed to be a partitioned block.  Put any JS at the top of the block and then put your JSX template below.

````md
```jsx
let [ value, setValue ] = useState(false);

<label>
  <Checkbox value={value} onChange={setValue} /> { value ? 'Checked' : 'Unchecked' }.
</label>
```
````

Attempting static imports within a partitioned block will result in parsing errors.
