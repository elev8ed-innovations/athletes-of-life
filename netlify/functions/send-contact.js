'use strict';
const {Resend}=require('resend');
const {escapeHtml,cleanText}=require('./audit-utils');
const resend=new Resend(process.env.RESEND_API_KEY);
exports.handler=async event=>{
 const reply=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 if(event.httpMethod!=='POST')return reply(405,{error:'POST required'});
 if(Buffer.byteLength(event.body||'')>12000)return reply(413,{error:'Request too large'});
 let body;try{body=JSON.parse(event.body)}catch{return reply(400,{error:'Invalid request'})}
 if(!body||typeof body!=='object'||Array.isArray(body))return reply(400,{error:'Invalid request'});
 const name=cleanText(body.name,80),email=cleanText(body.email,254),sport=cleanText(body.sport,100),interest=cleanText(body.interest,100),message=cleanText(body.message,4000);
 if(!name||!message||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply(400,{error:'Name, valid email and message required'});
 const from='hello@athletesoflife.online';
 const send=async data=>{const result=await resend.emails.send({from,...data});if(!result||result.error||!result.data?.id)throw new Error('Delivery unconfirmed')};
 const delivered=await Promise.allSettled([
 send({to:process.env.NOTIFY_EMAIL||'a.lever.p7@gmail.com',replyTo:email,subject:'New Athletes of Life inquiry — '+name,html:'<h2>New inquiry</h2><p>'+escapeHtml(name)+' · '+escapeHtml(email)+'</p><p>'+escapeHtml(sport)+' · '+escapeHtml(interest)+'</p><p>'+escapeHtml(message)+'</p>'}),
 send({to:email,subject:'We received your message, '+name,html:'<div style="background:#101512;color:#f4f0e5;padding:32px;font-family:Arial"><h2 style="color:#c9a84c">ATHLETES OF LIFE</h2><p>Hi '+escapeHtml(name)+',</p><p>Thanks for reaching out. Your message has been received.</p><p>'+escapeHtml(message)+'</p><p>Anthony Lever<br>Athletes of Life</p></div>'})]);
 if(delivered[0].status!=='fulfilled')return reply(502,{success:false,error:'Inquiry delivery unconfirmed'});
 return reply(200,{success:true,emailSent:delivered[1].status==='fulfilled'});
};
