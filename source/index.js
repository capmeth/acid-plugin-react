import path from 'node:path'


export default function (config, param)
{
    let { cobe, copy, parsers, scripts } = config;
    let { exts, types, specifier, filename } = { ...param };

    exts ||= '.jsx';
    types ||= [ 'jsx' , 'react' ];
    specifier ||= 'react-render';
    filename ||= 'acid-react-render.js';

    copy.unshift({ files: path.join(import.meta.dirname, 'renderer.js'), to: filename });

    cobe.push({ types, use: specifier });

    parsers.push({ types: exts, use: path.join(import.meta.dirname, 'parser.js') });

    // babel loaded globally as "Babel"
    scripts.push('https://unpkg.com/@babel/standalone@7/babel.min.js');

    config.importMap =
    {
        "react": "https://esm.sh/react@19",
        "react-dom/client": "https://esm.sh/react-dom@19/client",
        [specifier]: `./${filename}`
    };
}
