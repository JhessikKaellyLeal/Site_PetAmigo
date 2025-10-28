/* variavel:
é como uma caixa que serve para
armazenar informações. é um espaço no 
programa/computador que armazena dados.

*/

// pode mudar o valor a qualquer momento

let nomevariavel = 1; // inteiro
let nomevariavel2 = "jhessik"; //varchar
let nomevariavel3 = 2.7; //double
let nomevariavel4 = true; // boolean

// váriavel constante, que não altera o valor

const nome = "jhessik";

// operações matemáticas básicas

let soma = 3 + 5; // 8
let subtracao = 5 - 3; // 2
let multiplicacao = 3 * 5; //15
let divisao = 10 / 2; //5

// juntar textos

let primeironome = "jhessik ";
let sobrenome = "Leal";
let nomecompleto = primeironome + sobrenome;

// funções

// função ela imprime o Olá mundo
/* função sem parametro:
que não recebe dados dentro do ()
*/
function imprimirMsg() {
    // console é utilizado para mostrar textos
    console.log("Hello Word!");
    console.log(primeironome + " Bem Vinda!");
}
// função com parametros
function somarValores(valor1, valor2) {
    let soma = valor1 + valor2;
    console.log("O Resultado da soma é:" + soma);
}

function subtrairValores(valor1, valor2) {
    let sub = valor1 - valor2;
    console.log("O Resultado da subtração é:" + sub);
}

imprimirMsg();
somarValores(20, 40);
subtrairValores(100, 10);

function imc(altura, peso, nomepessoa) {
    let resultado = (altura / peso) * altura;
    console.log(nomepessoa + " o seu IMC é: " + resultado);
}

imc(1.80, 70, "Rhauan");

// condicional
/*
É uma ação que é executada com base em um critério
- se chover irei ao cinema, se fizer sol irei à praia

- hoje choveu! (ir ao cinema)
- hoje fez sol! (ir à praia)

Se fizer sol e eu tiver dinheiro, irei à praia,
 senão ficarei em casa.
 - Fez sol e tenho dinheiro (irei à praia)
 - Fez sol mas não tenho dinheiro(casa)
 - Choveu mas eu tenho dinheiro (casa)

 Se fizer sol ou eu tiver dinheiro, irei à praia,
 senão ficarei em casa.
 - Fez sol e tenho dinheiro (praia)
 - Fez sol mas não tenho dinheiro(praia)
 - Choveu mas eu tenho dinheiro (praia)
 - choveu e eu tô pobre (casa)
*/

let n1 = 15;
let n2 = 45;
// if - SE  else - Senão

// se n1 for igual a 10 
if (n1 == 10) {
    console.log("Irei à praia!");
} else {
    console.log("Fico em casa!");
}


// se n1 for maior que 10
if (n1 > 10) {
    console.log("Irei à praia!");
} else {
    console.log("Fico em casa!");
}

// se n1 for maior que 10 E n2 for menor que 40
if (n1 > 10 & n2 < 40) {
    console.log("Irei à praia!");
} else {
    console.log("Fico em casa!");
}

// se n1 for maior que 10  OU   n2 menor que 40
if (n1 > 10 || n2 < 40) {
    console.log("Irei à praia!");
} else {
    console.log("Fico em casa!");
}

/*
Se n1 for maior que 10 E n1 for maior que n2 E 
n2 for maior que 45

 */

if (n1 > 10 && n1 > n2 && n2 > 45) {
    console.log("Irei à praia!");
} else {
    console.log("Fico em casa!");
}
/*
1° condição - n1 menor que 10 E n2 maior que n1
                        OU
2° condição - n2 maior que 40 e n2 menor que 46
*/


if ((n1 < 10 && n1 < n2) || (n2 > 40 && n2 < 46)) {
    console.log("Irei à praia!");
} else {
    console.log("Fico em casa!");
}



// if aninhado
// se n1 é maior que 12 E n2 maior que 48
if (n1 > 12 && n2 > 48) {
    console.log("Irei à praia!");
    // se n1 é maior ou igual a 15 E n2 menor que 45
} else if (n1 >= 15 && n2 < 45) {
    console.log("Vou ao cinema!");
    /* se n1 é maior que 14 E n2 igual a 45 
                E   
     se n2 for maior que n1 OU n1 maior ou igual a 15
    */
} else if ((n1 > 14 && n2 == 45) && (n2 > n1 || n1 >= 15)) {
    console.log("Vou ao shopping!");
} else {
    console.log("Fico em casa!");
}



if (n1 > 12 & n2 > 48) {
    console.log("Irei à praia!");
} else if (n1 >= 15 & n2 < 45) {
    console.log("Vou ao cinema!");
} else if ((n1 > 14 & n2 == 45) & (n2 > n1 || n1 >= 15)) {
    console.log("Vou ao shopping!");
} else {
    console.log("Fico em casa!");
}


// OBJETO CARRO

let carro = {
    cor: "preto",
    placa: "KJH9876",
    modelo: "fusca",
    kmRodados: 120000,
    som: true,
    arcondicionado: false
};
console.log(carro.cor+carro.modelo+carro.placa);