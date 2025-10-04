import fs from 'node:fs/promises'
import { Parser } from 'acorn'
import jsx from 'acorn-jsx'
import objectPath from 'object-path';
import objectScan from 'object-scan';
import { generate } from 'astring'


let proptypeRe = /PropTypes\.([A-Za-z]+)(?:\((.*?)\))?(\.isRequired)?$/;
let dearrayRe = /^\[|\]$/g;
let commaRe = /\s*,\s*/g;
let pathfixRe = /\[([0-9]+)\]/g;
let comptagRe = /^\s*\*?\s*@component/m;

let get = (node, path) => objectPath.get(node, path.replace(pathfixRe, '.$1'))
let scanner = (query, filterFn, opts) => objectScan([].concat(query), { joined: true, filterFn, ...opts })

let propscan = scanner('body.**', ({ parent, value }) =>
{
    if (value?.type === 'ObjectExpression')
    {
        if (parent.left?.type === 'MemberExpression' && parent.left.property?.name === 'propTypes')
            return true;

        if (parent.key?.type === 'Identifier' && parent.key.name === 'propTypes')
            return true;
    }

    return false;        
});

let namepath =
{
    Identifier: 'declaration.name',
    ClassDeclaration: 'declaration.id.name',
    FunctionDeclaration: 'declaration.id.name',
    VariableDeclaration: 'declaration.declarations.0.id.name'
};


export default function ()
{
    /**
        Parse source code.
    */
    return async (file, parse) =>
    {
        return fs.readFile(file, { encoding: 'utf8' }).then(async source =>
        {
            let data = {};

            let current, comments = [], tokenmap = {};
            let aster = Parser.extend(jsx());

            let getComment = node =>
            {
                let text = tokenmap[node.start] || '';
                // ensure JSDoc-style block comment
                return text.startsWith('*') ? text.slice(1).trim() : '';
            }

            let findComment = () => comments.find(comment => comment.match(comptagRe)) || ''

            let ast = aster.parse(source, 
            {
                ecmaVersion: 'latest', 
                sourceType: 'module', 
                // params => (block, text, beginIndex, endIndex)
                onComment: (block, text) => block && comments.push(current = text),
                onToken: token => current && (tokenmap[token.start] = current, current = void 0)
            });

            // default export node
            let node = ast.body.find(node => node.type === 'ExportDefaultDeclaration');

            data = parse(node && getComment(node) || findComment());

            if (node)
            {
                let exptype = namepath[node.declaration.type];
                if (exptype) data.name ||= get(node, exptype);
            }

            // propTypes definition block (should only be 1)
            let [ pnode ] = propscan(ast);

            if (pnode)
            {
                let list = get(ast, `${pnode}.properties`);

                list.forEach(item => 
                {
                    if (item.key)
                    {
                        let name = item.key.name;
                        let cdata = parse(getComment(item));
                        let typed = getTypeData(generate(item));
                        
                        (data.props ||= []).push({ name, ...cdata, ...typed });
                    }
                });
            }

            return data;
        });
    }
}


let toArray = value => value.replace(dearrayRe, '').split(commaRe)

let getTypeData = string =>
{
    let data = {};

    if (proptypeRe.test(string))
    {
        let [ type, spec, required ] = proptypeRe.exec(string).slice(1);
        
        switch (type)
        {
            case 'arrayOf':
            case 'objectOf':
                data.type = `${type.slice(0, -2)}<${getTypeData(spec).type}>`;
                break;

            case 'instanceOf':
                data.type = spec;
                break;

            case 'oneOf':
                data.type = 'enum';
                data.values = toArray(spec).join(', ');
                break;

            case 'oneOfType':
                data.type = toArray(spec).map(t => getTypeData(t).type).join(' | ')
                break;
            
            case 'shape':
            case 'exact':
                // fall-through for now
            
            default:
                data.type = type;
        }

        data.required = !! required;        
    }

    return data;
}
