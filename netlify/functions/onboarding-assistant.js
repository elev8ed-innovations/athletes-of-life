'use strict';
const Anthropic=require('@anthropic-ai/sdk');
const {cleanAuditText}=require('./audit-utils');
const {assistantContext,assistantSystem}=require('./assistant-context');
const client=new Anthropic({apiKey:process.env.ANTHROPIC_API_KEY,timeout:20000,maxRetries:0});
exports.handler=async event=>{
 const response=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
 if(event.httpMethod!=='POST')return response(405,{error:'POST required'});
 if(Buffer.byteLength(event.body||'')>16000)return response(413,{error:'Request too large'});
 let context;try{context=assistantContext(JSON.parse(event.body))}catch{return response(400,{error:'Invalid question'})}
 try{const result=await client.messages.create({model:process.env.ANTHROPIC_MODEL||'claude-sonnet-5',max_tokens:350,system:assistantSystem(context.language),messages:[{role:'user',content:JSON.stringify(context)}]});const raw=result.content.filter(b=>b.type==='text').map(b=>b.text).join('\n').trim();const reply=cleanAuditText(raw);if(!reply||result.stop_reason==='max_tokens')throw new Error('Incomplete response');return response(200,{reply,generatedByAi:true})}catch{return response(503,{error:'Assistant temporarily unavailable',generatedByAi:false})}
};
