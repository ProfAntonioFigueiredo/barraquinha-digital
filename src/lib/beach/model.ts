export const MENU = [
 {id:'coco',name:'Água de coco',description:'Gelada, servida no coco.',category:'Bebidas',price:1200,icon:'🥥'},
 {id:'agua',name:'Água mineral',description:'Garrafa de 500 ml.',category:'Bebidas',price:500,icon:'💧'},
 {id:'suco',name:'Suco de abacaxi',description:'Copo de 400 ml, feito na hora.',category:'Bebidas',price:1400,icon:'🍍'},
 {id:'refri',name:'Refrigerante',description:'Lata de 350 ml.',category:'Bebidas',price:800,icon:'🥤'},
 {id:'pastel',name:'Pastel de queijo',description:'Massa crocante, queijo derretido.',category:'Comidas',price:1500,icon:'🥟'},
 {id:'batata',name:'Batata frita',description:'Porção para compartilhar.',category:'Comidas',price:2800,icon:'🍟'},
 {id:'peixe',name:'Iscas de peixe',description:'Porção com limão e molho da casa.',category:'Comidas',price:4800,icon:'🐟'},
 {id:'milho',name:'Milho na manteiga',description:'Espiga quentinha com manteiga.',category:'Comidas',price:1000,icon:'🌽'},
] as const;
export const STATUSES = ['recebido','em preparo','pronto','entregue','cancelado'] as const;
export type Status = typeof STATUSES[number];
export const NEXT: Record<Status,readonly Status[]> = {recebido:['em preparo','cancelado'],'em preparo':['pronto','cancelado'],pronto:['entregue','cancelado'],entregue:[],cancelado:[]};
export type Order = {id:string;kind:'beach_order';number:string;keyHash:string;location:string;items:{id:string;name:string;quantity:number;unitPrice:number}[];total:number;status:Status;createdAt:string;updatedAt:string;history:{status:Status;at:string}[];demo:boolean;requestHash?:string};
export const money = (cents:number) => (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function publicOrder(order:Order) { return {number:order.number,location:order.location,items:order.items,total:order.total,status:order.status,createdAt:order.createdAt,updatedAt:order.updatedAt,history:order.history,demo:order.demo}; }
