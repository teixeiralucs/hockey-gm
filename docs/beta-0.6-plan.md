# Hockey GM 0.6 Beta

## 1. A Expansão

Dando um novo passo para o projeto nós entramos agora na NHL (American Hockey League). A liga se extende para os Estados Unidos e Canadá e conta com 32 Times. Ao aceitar evoluir para a NHL o jogador poderá escolher um de 6 times aleatórios assim como é na escolha da AHL. O time escolhido terá seus 20 jogadores do roster aleatorizados da mesma forma que é com a AHL porém com os jogadores da NHL. Jogadores da AHL só poderão aparecer nessa fase mediante a compra.

## 1.1 Estrutura da Liga

A NHL é dividida em duas conferências com 32 equipes totais:

### 1.1.1 Eastern Conference
### 1.1.1.1  Atlantic Division

- Charlotte Checkers
- Hartford Wolf Pack
- Hershey Bears
- Lehigh Valley Phantoms
- Providence Bruins
- Springfield Thunderbolts
- Wilkes-Barre/Scranton Penguins

### 1.1.1.2 North Division

- Belleville Senators
- Cleveland Monsters
- Hamilton Hammers
- Laval Rocket
- Rochester Americans
- Syracuse Crunch
- Toronto Marlies
- Utica Comets

#### 1.1.2 Western Conference 
### 1.1.2.1  Central Division

- Chicago Wolves
- Grand Rapid Griffins
- Iowa Wild
- Manitoba Moose
- Milwaukee Admirals
- Rockford IceDogs
- Texas Stars

### 1.1.2.2  Pacific Division
- Abbotsford Canucks
- Bakersfield Condors
- Calgary Wranglers
- Coachella Valley Firebirds
- Colorado Eagles
- Henderson Silver Knights
- Ontario Reign
- San Diego Gulls
- San Jose Barracuda
- Tucson Roadrunners

A liga possui 72 rodadas, distribuidas entre os dias Sexta a Domingo. Começando na terceira Sexta-feira de outubro e se estendendo até a metade de abril.

## 1.2 Post Season

O Formato de Pós-Temporada é completamente diferente, 23 dos 32 avançam, eles se organizam assim
- Atlantic Division = 6 melhores avançam;
- North Division = 5 melhores avançam;
- Central Division =  5 melhores avançam;
- Pacific Division = 7 melhores avançam.

### 1.2.1 Primeira rodada (Melhor de 3)
A primeira rodada é apenas para os piores times, que jogam 3 jogos durante o primeiro fim de semana das playoffs

- Atlantic = O 1º e 2º colocados descansam, jogam os 3º x 6º e 4º x 5º;
- North: O 1º, 2º e 3º colocados descansam. Joga apenas: 4º x 5º;
- Central: O 1º, 2º e 3º colocados descansam. Joga apenas: 4º x 5º;
- Pacific: O 1º colocado descansa. Jogam: 2º x 7º, 3º x 6º e 4º x 5º.

### 1.2.2 Divisional Semifinals (Melhor de 5)
Aqui o código tem que verificar as posições na tabela original para formar as seeds, O time com a melhor campanha na divisão sempre joga contra o com a pior camapnha e que sobreviveu a primeira rodada (Seed 1), Na Seed 2 joga contra o segundo pior, e assim por diante.


### 1.2.3 Divisional Finals (Melhor de 5)
No fim, os dois sobreviventes de cada divisão se enfrentam, quem ganahr é coroado Campeão da Divisão.

### 1.2.4 Conference Finals (Melhor de 7)
Aqui aumenta a quantidade de jogos e trás os 4 campeões das divisionals finals para se enfrentar
- Eastern Conference = Campeão da Atlantic x Campeão da North
- Western Conference = Campeão da Central x Campeão da Pacific

### 1.2.5 Calder Cup (Melhor de 7)
Por fim os vencedores das Conferencias se enfrentam para ver quem leva a Calder Cup.

## 2. Força da Franquia

A Força da franquia é determinada pela média das forças dos jogadores isso determina quão bem o time irá se sair na temporada.

### 2.1 Tier da Franquia

Todos os times da NHL são considerados A-List, possuindo as médias levemente mais altas que os jogadores anteriores do sistema, as médias dos jogadores serão entre 70 e 82 variando de forma de acordo com os stats definidos pelo desempenho do jogador na vida real.

## 3. Os Jogadores

Os Jogadores são classificados da mesma forma que nas outras ligas.

### 4. Overall

Overall é a nota geral do jogador, ela decidirá sua habilidade total assim como a média geral do seu time, o Overall é formado pela média das habilidades principais.

## 5. Sistema de Draft/Shop

O Draft funcionará na forma de um shop, o usuário ao ganhar partidas receberá moedas que serão gastas em packs de jogadores aleatórios das ligas ede mesmo tier. Cada liga terá um custo diferente baseado no seu tier.

### 5.1 Ligas Disponíveis

Dentro do shop da NHL os jogadores terão acesso a os packs de Tiers anteriores, considerando aqui a OHL, WHL e QMJHL (com os preços regulares) juntamente com os jogadores da FPHL e AHL, além de uma nova área para os packs da NHL.

Os packs terão valores de 790 para o standard com 3 jogadores, 2000 para o Jumbo AAA, 1125 para o Foward, Defense e Golies packs. No Free Agency os valores serão 1015 para Bronze, 1350 para Silver e 1690 para Gold.

## 6. Simulação

A Simulação ocorrerá do mesmo modo que nas outras ligas. 

## 7. Sistema de Idades.

Como não há limites de idade dentro da NHL as regras de envelhecimento mudarão. Os jogadores jogarão até os 45 anos, a progressão de status continua de 5 em 5 anos.

# 8. Regras Gerais

As regras mais basicas continuam sendo aplicadas aqui.

# 9. Recompensa de Vitórias

O valores base dobram e passam a ser entre 240 e 280 moedas, uma derrota normal mantem essa base (x1), uma derrota na prorrogação dá x1.5, uma vitória independente de como foi garante x1.75.

Durante as playoffs as Quartas de finais são de x1.7 (x2.0 no ultimo jogo caso o time avance para a próxixma fase), as Semi de x2.3 (x2.6 no ultimo jogo caso avance para a proxima fase) e a final de x3.0 (x5.0 no ultimo jogo caso vença a liga).

# 10. Sistema de Pontos.

A NHL usará o metodo tradicional da NHL e de outras ligas de hockey

# 11. Do Jumbo Pack

Dentro do jumbo pack os jogadores A-List que apareciam como buffers do jogadores da ECHL, agora são jogadores reais da AHL, com suas propriedades originais calculadas. Os jogadores do jumbo da NHL por hora serão jogadores da NHL buffados com a denominação de S-List. As regras continuam as mesma do jumbo pack anterior.

# 12. Campeão da NHL

Ao ganhar a Calder Cup o jogador será convidado a ingressar a NHL tendo esta sendo considerada a S-List liga do sistema. (A NHL será implementada no futuro, por hora o sistema não fará nada)

