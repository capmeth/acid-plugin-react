import React from 'react'
import ReactDOM from 'react-dom/client'


let portRe = /^\s*(?:im|ex)port/;
let babelConfig = { presets: [ [ 'env', { modules: false } ], 'react' ] };
let modulize = code => import(`data:text/javascript,${encodeURIComponent(code)}`);

export default function ()
{
    let rootmap = new Map(); 

    let render = async ({ source, imports, el }) =>
    {
        let body = 
        `
            import React from 'react'
            ${imports}
        `

        if (portRe.test(source))
        {
            // standalone component module
            body += source;
        }
        else
        {
            let { code, template } = partition(source);

            body += 
            `   
                export default function ()
                {
                    ${code}

                    return (<>${template}</>);
                }
            `;
        }

        let { default: Boundary } = await modulize(Babel.transform(trap, babelConfig).code);
        let { default: Component } = await modulize(Babel.transform(body, babelConfig).code);

        if (!rootmap.has(el)) rootmap.set(el, ReactDOM.createRoot(el));

        return new Promise((success, failure) => 
        {
            let elem = React.createElement(Component);
            let bound = React.createElement(Boundary, { success, failure }, elem);

            rootmap.get(el).render(bound)
        });
    }

    return { render };
}

let partRe = /(?:^|\n)\s*(?<tmp><.+)$/s;

let partition = source =>
{
    let result = source.match(partRe);
    let template = result ? result.groups.tmp.trim() : '';
    let code = result ? source.replace(template, '').trim() : '';

    return { code, template };
}

let trap =
`
    import React from 'react'

    export default class ErrorBoundary extends React.Component 
    {
        constructor(props) 
        { 
            super(props); 
            this.error = null;
        }

        componentDidCatch(error) { this.props.failure(this.error = error); }

        componentDidUpdate() { !this.error && this.props.success(); }

        render() { return this.props.children; }
    }
`;
