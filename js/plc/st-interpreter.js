(function (A) {
  'use strict';
  const KEYWORDS=new Set(['PROGRAM','END_PROGRAM','VAR','END_VAR','BOOL','INT','DINT','REAL','TIME','STRING','IF','THEN','ELSIF','ELSE','END_IF','AND','OR','NOT','MOD','TRUE','FALSE']);
  class STError extends Error {
    constructor(message,line,column){
      super(`${message} (line ${line}, column ${column})`);this.line=line;this.column=column;this.name='STError';
    }
  }
  class Lexer {
    constructor(source){
      this.source=source;this.i=0;this.line=1;this.column=1;this.tokens=[];
    }
    peek(n=0){
      return this.source[this.i+n]||'\0';
    }
    advance(){
      const c=this.source[this.i++];if(c==='\n'){
        this.line++;this.column=1;
      }
      else this.column++;return c;
    }
    tokenize(){
      while(this.i<this.source.length){
        const c=this.peek();if(/\s/.test(c)){
          this.advance();continue;
        }
        if(c==='/'&&this.peek(1)==='/'){
          while(this.peek()!=='\n'&&this.peek()!=='\0')this.advance();continue;
        }
        if(c==='('&&this.peek(1)==='*'){
          this.advance();this.advance();while(!(this.peek()==='*'&&this.peek(1)===')')&&this.peek()!=='\0')this.advance();if(this.peek()==='\0')throw new STError('Unterminated block comment',this.line,this.column);this.advance();this.advance();continue;
        }
        const line=this.line,col=this.column;if(/[A-Za-z_]/.test(c)){
          let s='';while(/[A-Za-z0-9_]/.test(this.peek()))s+=this.advance();const u=s.toUpperCase();this.tokens.push({
            type:KEYWORDS.has(u)?u:'IDENT',value:s,line,column:col
          }
          );continue;
        }
        if(/[0-9]/.test(c)){
          let s='';while(/[0-9.]/.test(this.peek()))s+=this.advance();if((s.match(/\./g)||[]).length>1)throw new STError('Invalid numeric literal',line,col);this.tokens.push({
            type:'NUMBER',value:Number(s),line,column:col
          }
          );continue;
        }
        if(c==="'"){
          this.advance();let s='';while(this.peek()!=="'"&&this.peek()!=='\0')s+=this.advance();if(this.peek()==='\0')throw new STError('Unterminated string',line,col);this.advance();this.tokens.push({
            type:'STRING_LITERAL',value:s,line,column:col
          }
          );continue;
        }
        const two=c+this.peek(1);if([':=','<=','>=','<>'].includes(two)){
          this.advance();this.advance();this.tokens.push({
            type:two,value:two,line,column:col
          }
          );continue;
        }
        if('+-*/=<>();,:'.includes(c)){
          this.advance();this.tokens.push({
            type:c,value:c,line,column:col
          }
          );continue;
        }
        throw new STError('Unexpected character '+c,line,col);
      }
      this.tokens.push({
        type:'EOF',value:'',line:this.line,column:this.column
      }
      );return this.tokens;
    }
  }
  class Parser {
    constructor(tokens){
      this.t=tokens;this.i=0;this.variables={
      }
      ;
    }
    peek(){
      return this.t[this.i];
    }
    take(){
      return this.t[this.i++];
    }
    is(type){
      return this.peek().type===type;
    }
    expect(type){
      const t=this.take();if(t.type!==type)throw new STError(`Expected ${type}, found ${t.type}`,t.line,t.column);return t;
    }
    accept(type){
      if(this.is(type)){
        return this.take();
      }
      return null;
    }
    parse(){
      this.expect('PROGRAM');const name=this.expect('IDENT').value;const declarations={
      }
      ;if(this.accept('VAR')){
        while(!this.is('END_VAR')&&!this.is('EOF')){
          const id=this.expect('IDENT');this.expect(':');const type=this.take();if(!['BOOL','INT','DINT','REAL','TIME','STRING'].includes(type.type))throw new STError('Unsupported variable type',type.line,type.column);let initial=type.type==='BOOL'?false:type.type==='STRING'?'':0;if(this.accept(':='))initial=this.expression();this.expect(';');declarations[id.value]={
            type:type.type,initial
          }
          ;
        }
        this.expect('END_VAR');
      }
      const body=this.statements(['END_PROGRAM']);this.expect('END_PROGRAM');this.expect('EOF');return {
        name,declarations,body
      }
      ;
    }
    statements(stops){
      const out=[];while(!stops.includes(this.peek().type)&&!this.is('EOF'))out.push(this.statement());return out;
    }
    statement(){
      if(this.accept('IF')){
        const test=this.expression();this.expect('THEN');const consequent=this.statements(['ELSIF','ELSE','END_IF']);const branches=[{
          test,body:consequent
        }
        ];while(this.accept('ELSIF')){
          const et=this.expression();this.expect('THEN');branches.push({
            test:et,body:this.statements(['ELSIF','ELSE','END_IF'])
          }
          );
        }
        let alternate=[];if(this.accept('ELSE'))alternate=this.statements(['END_IF']);this.expect('END_IF');this.expect(';');return {
          kind:'if',branches,alternate
        }
        ;
      }
      const id=this.expect('IDENT');this.expect(':=');const value=this.expression();this.expect(';');return {
        kind:'assign',name:id.value,value
      }
      ;
    }
    expression(min=0){
      let left=this.prefix();const prec={
        OR:1,AND:2,'=':3,'<>':3,'<':3,'>':3,'<=':3,'>=':3,'+':4,'-':4,'*':5,'/':5,MOD:5
      }
      ;while((prec[this.peek().type]||0)>min){
        const op=this.take().type;const right=this.expression(prec[op]);left={
          kind:'binary',op,left,right
        }
        ;
      }
      return left;
    }
    prefix(){
      const t=this.take();if(t.type==='NUMBER'||t.type==='STRING_LITERAL')return {
        kind:'literal',value:t.value
      }
      ;if(t.type==='TRUE'||t.type==='FALSE')return {
        kind:'literal',value:t.type==='TRUE'
      }
      ;if(t.type==='NOT'||t.type==='-')return {
        kind:'unary',op:t.type,value:this.expression(6)
      }
      ;if(t.type==='('){
        const e=this.expression();this.expect(')');return e;
      }
      if(t.type==='IDENT'){
        if(this.accept('(')){
          const args=[];if(!this.is(')')){
            args.push(this.expression());while(this.accept(','))args.push(this.expression());
          }
          this.expect(')');return {
            kind:'call',name:t.value,args
          }
          ;
        }
        return {
          kind:'variable',name:t.value
        }
        ;
      }
      throw new STError('Expected expression',t.line,t.column);
    }
  }
  function evaluate(node,env){
    switch(node.kind){
      case'literal':return node.value;case'variable':if(!(node.name in env))throw new Error('Undeclared variable '+node.name);return env[node.name];case'unary':return node.op==='NOT'?!evaluate(node.value,env):-Number(evaluate(node.value,env));case'binary':{
        const a=evaluate(node.left,env),b=evaluate(node.right,env);switch(node.op){
          case'OR':return !!a||!!b;case'AND':return !!a&&!!b;case'=':return a===b;case'<>':return a!==b;case'<':return a<b;case'>':return a>b;case'<=':return a<=b;case'>=':return a>=b;case'+':return a+b;case'-':return a-b;case'*':return a*b;case'/':if(b===0)throw new Error('Division by zero');return a/b;case'MOD':return a%b;default:throw new Error('Unsupported operator '+node.op);
        }
      }
      case'call':{
        const args=node.args.map(a=>evaluate(a,env)),fn={
          ABS:Math.abs,MIN:Math.min,MAX:Math.max,LIMIT:(lo,x,hi)=>Math.max(lo,Math.min(hi,x)),SEL:(g,a,b)=>g?a:b,REAL_TO_INT:x=>Math.trunc(x),INT_TO_REAL:x=>Number(x)
        }
        [node.name.toUpperCase()];if(!fn)throw new Error('Unsupported function '+node.name);return fn(...args);
      }
      default:throw new Error('Invalid AST node');
    }
  }
  function executeStatements(body,env){
    for(const s of body){
      if(s.kind==='assign'){
        if(!(s.name in env))throw new Error('Assignment to undeclared variable '+s.name);env[s.name]=evaluate(s.value,env);
      }
      else if(s.kind==='if'){
        let selected=false;for(const b of s.branches){
          if(evaluate(b.test,env)){
            executeStatements(b.body,env);selected=true;break;
          }
        }
        if(!selected)executeStatements(s.alternate,env);
      }
    }
  }
  class STProgram {
    constructor(ast){
      this.ast=ast;this.env={
      }
      ;Object.entries(ast.declarations).forEach(([k,v])=>{
        this.env[k]=v.initial&&v.initial.kind?evaluate(v.initial,{
        }
        ):v.initial;
      }
      );this.scanCount=0;
    }
    setInputs(inputs){
      Object.entries(inputs||{
      }
      ).forEach(([k,v])=>{
        if(k in this.ast.declarations)this.env[k]=v;
      }
      );
    }
    execute(){
      executeStatements(this.ast.body,this.env);this.scanCount++;return Object.assign({
      }
      ,this.env);
    }
    reset(){
      Object.entries(this.ast.declarations).forEach(([k,v])=>{
        this.env[k]=v.initial&&v.initial.kind?evaluate(v.initial,{
        }
        ):v.initial;
      }
      );this.scanCount=0;
    }
  }
  class STInterpreter {
    compile(source){
      const tokens=new Lexer(source).tokenize();const ast=new Parser(tokens).parse();return new STProgram(ast);
    }
  }
  A.STInterpreter=STInterpreter;A.STError=STError;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
