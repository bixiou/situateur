$(document).ready(function($) {
    var grapheRevenuFinal = new cfx.Chart();
    grapheRevenuFinal.setGallery(cfx.Gallery.Lines);
    var grapheRevenuImposable = new cfx.Chart();
    grapheRevenuImposable.setGallery(cfx.Gallery.Lines);
    var grapheImpotActuel = new cfx.Chart();
    grapheImpotActuel.setGallery(cfx.Gallery.Lines);
    var grapheNouvelImpot= new cfx.Chart();
    grapheNouvelImpot.setGallery(cfx.Gallery.Lines);
    var graphe = { "revenuImposable":grapheRevenuImposable, "revenuFinal":grapheRevenuFinal, "impotActuel":grapheImpotActuel, "nouvelImpot":grapheNouvelImpot};
    var donneesRevenuFinal, donneesRevenuImposable, donneesImpotActuel, donneesNouvelImpot;
    var w=749, sliders = new Array ;
    var donnees = {"revenuImposable":donneesRevenuImposable, "revenuFinal":donneesRevenuFinal, "impotActuel":donneesImpotActuel, "nouvelImpot":donneesNouvelImpot};
    
    $.ajax({
        url:'densite_fonctionRepartition_revenuImposable.txt',
        success: function(data){
            chargeDonneesGraphe(data,'revenuImposable');
            $('body').trigger('attendAutreGraphe');
        },
        error: function(){ alert('Les données n\'ont pas pu être chargées');}
    });

    $.ajax({
        url:'densite_fonctionRepartition_revenu_hors_alloc_a.txt',
        success: function(data){ 
            chargeDonneesGraphe(data,'revenuFinal');
            $('body').trigger('chargeImpot');
            simuleImpot();
        },
        error: function(){ alert('Les donn�es n\'ont pas pu �tre charg�es');}
    });
    
    $('body').on('attendAutreGraphe',function () {
        $('body').on('chargeImpot',function(){
            traceImpotActuel(); 
        })
     //   if (donnees['revenuFinal'][0]!='undefined') {
     //       traceImpotActuel();
     //   }
    })
    
    function chargeDonneesGraphe(texte,nom) {
        //chargement des donn�es
        var dat=texte;
        var tab=dat.split('\n');
        k=tab.length-1;
        donnees[nom] = new Array(k);
        for (i=0;i<k;i++){
            donnees[nom][i]={densite: parseInt(tab[i].split('\t')[0]), repartition: parseInt(tab[i].split('\t')[1]),revenu: parseInt(tab[i].split('\t')[2])};
        }
        traceGraphe(nom);
    }
    
    function traceGraphe(nom) {
    //d�finition des axes
        var axeY = new cfx.FieldMap();
        axeY.setName("revenu");
        axeY.setUsage(cfx.FieldUsage.Value);
        graphe[nom].getDataSourceSettings().getFields().add(axeY);
        var axeX = new cfx.FieldMap();
        axeX.setName("repartition");
        axeX.setUsage(cfx.FieldUsage.XValue);
        graphe[nom].getDataSourceSettings().getFields().add(axeX);
        graphe[nom].setDataSource(donnees[nom]);

    //configuration de la mise en forme
        graphe[nom].getAxisX().setMax(50000000);
        graphe[nom].getAxisY().setMax(150000);
        graphe[nom].getAllSeries().setMarkerShape(cfx.MarkerShape.None);
        graphe[nom].getAxisX().getGrids().getMajor().setVisible(true);
        graphe[nom].getAxisY().getGrids().getMajor().setVisible(true);
        var titreX, titreY;
        titreX = new cfx.TitleDockable();
        titreX.setText("Nombre d\'adultes français ayant un revenu final inférieur à l\'ordonnée correspondante");
        titreY = new cfx.TitleDockable();            
        titreY.setText(nom);
        graphe[nom].getAxisY().setTitle(titreY);
        graphe[nom].getAxisX().setTitle(titreX);
        if (nom=='revenuFinal') {
            graphe[nom].getSeries().getItem(0).setColor("#FF0000");
            titreY.setText('__________________________________________________revenu final (rouge)');
        }
        if (nom=='nouvelImpot') {
            graphe[nom].getSeries().getItem(0).setColor("#008000");
            titreY.setText('nouvel impôt (vert)__________________________________________________');
        }
     
        var div = document.getElementById(nom); 
        graphe[nom].create(div);
    }
    
    function ajusteCourbe(seuils,tauxImposition) {
        var tauxCorriges=tauxImposition, ligne, T, n=tauxImposition.length;
        var l= donneesRevenuFinal.length;
        var tauxCorrigesGauche, tauxCorrigesDroite;
        
        function determineLigneA(){
            var i=0;
            while(i<l && donneesRevenuFinal[i].revenu<donneesRevenuImposable[i].revenu) {
                i++;
            }          
            ligne=i;
        }
        
        function determineA() {
            var i=determineLigneA();
            var a=donneesRevenuFinal[i].repartition;
            return a;
        }
        
        function determineT(){
            var tGauche= sommePonderee('gauche',ligne,donneesRevenuImposable,seuils,tauxImposition);
            tGauche-=somme('gauche',ligne,donneesRevenuFinal);
            var tDroit=somme('droit',ligne,donneesRevenuFinal);
            tDroit-=sommePonderee('droit',ligne,donneesRevenuImposable,seuils,tauxImposition);
            var T=(tGauche+tDroit)/2;
            return T;
        }
        
        function insereSeuilA() {
            var i=0;
            var r=donneesRevenuFinal[ligne].revenu;
            
            while (seuils[i]<r) {
                i++;
            }
            if (seuils[i]==r) {
                tauxCorrigesGauche = tauxCorriges.slice(0,i+1);
                tauxCorrigesDroite = tauxCorriges.slice(i,tauxCorriges.length);
            }
            else {
                tauxA = ordonneeBarycentre(seuils[i-1],seuils[i],tauxCorriges[i-1],tauxCorriges[i],r);
                tauxCorrigesGauche = tauxCorriges.slice(0,i).concat([tauxA]);
                tauxCorrigesDroite = [tauxA].concat(tauxCorriges.slice(i,tauxCorriges.length));
            }
        }
        
        function ajuste(){
            var sommeActuelleGauche = somme('gauche',ligne,donneesRevenuFinal);
            tauxCorrigesGauche=dichotomie(sommeActuelleGauche,T,'gauche',ligne);
            var sommeActuelleDroite = somme('droite',ligne,donneesRevenuFinal);
            tauxCorrigesDroite=dichotomie(sommeActuelleDroite,-T,'droite',ligne);
            tauxCorriges=tauxCorrigesGauche.slice(0,-1).concat(tauxCorrigesDroite);
        }
        
        function verifieConditions(){
            var iA,iF,alerte=1;
            if (T<0) {
                alert('Votre proposition inclue un transfert d\'argent des pauvres vers les riches, nous ne la retenons pas.');
                alerte=0;
            }
            for (i=0;i<n-1;i++) {
                if (tauxCorriges[i]>tauxCorriges[i+1]) {
                    alert('Votre proposition ne conduit pas à un impôt progressif : en effet, les revenus au seuil n°'+i+' sont imposés à '+100*tauxCorriges[i]+'% tandis qu\'au seuil suivant ils sont imposés à '+100*tauxCorriges[i+1]+'%. Nous ne retenons donc pas votre proposition.');
                    alerte=0;
                }
            }
            for (i=0;i<l;i++) {
                iA=impotActuel(i);
                iF=impotFutur(i,seuils,tauxCorriges);
                if ((iA<iF && i<ligne) || (iA>iF && i>ligne) || (iF>impotFutur(i+1,seuils,tauxCorriges))) {
                    alert('Votre proposition n\'est pas socialement juste : comparez l\'impôt actuel ('+100*iA+'%) et l\impôt proposé ('+100*iF+'%) pour un revenu de '+donneesRevenuFinal[i].revenu+' par exemple. Nous ne retenons pas votre proposition.');
                    alerte=0;
                }
            }
            if (alerte) {
                alert('Votre proposition vérifie les contraintes.');
            }
        }
        
        a=determineA();
        insereSeuilA(); // définit tauxCorrigesG/D
        T=determineT();
        ajuste();
        verifieConditions();
        
        function dichotomie(sommeActuelle,T,morceau,ligne) {
        var precision=Math.pow(10,6),t=1,incr=0.1,taux,tauxA,u;
        var n=tauxImposition.length,sommeFuture=somme(morceau,ligne,donneesRevenuImposable);
        var signe=Math.sign(sommeActuelle-sommeFuture);
        if (morceau=='gauche') {
            taux=tauxCorrigesGauche;
        }
        if (morceau=='droite') {
            taux=tauxCorrigesDroite;           
        }
        u=taux.length;
        
        while (signe*(sommeActuelle+T-sommeFuture)>0) {
            t+=signe*incr;
            taux=multiplieTableau(taux,t,u,morceau);
            sommeFuture=sommePonderee(morceau,ligne,donneesRevenuImposable,seuils,taux);
        }
        incr/=2;
        while (Math.abs(sommeActuelle+T-sommeFuture)>precision) {
            if (sommeActuelle+T>sommeFuture) {
                t+=incr;
                taux=multiplieTableau(taux,t,u,morceau);
                sommeFuture=sommePonderee(morceau,ligne,donneesRevenuImposable,seuils,taux);
            }
            else {
                t-=incr;
                taux=multiplieTableau(taux,t,u,morceau);
                sommeFuture=sommePonderee(morceau,ligne,donneesRevenuImposable,seuils,taux);
            }           
        }
        return taux;
    }
    }
    
    function simuleImpot() {
        //Création des curseurs
        var nbSliders=11;;
        var seuils = new Array(nbSliders), tauxCorriges =new Array(nbSliders),  valeurSeuils  = new Array(nbSliders); 
        //seuils[0]=0, seuils[1]=un revenu, seuils[n-1]=revenu max
                
        for (j=0;j<nbSliders;j++) {
            seuils[j]=variable2(5000000*j,'repartition','revenu','revenuImposable');
            valeurSeuils[j]=variable2(5000000*j,'repartition','revenu','revenuFinal');
            configureSlider(j);
        }
        
        //Gestion des évènements, modification des taux, lance ajusteCourbe

        
    //Si l'utilisateur a changé les taux
        for (j=0;j<nbSliders;j++) {
            sliders['slider'+j].attachEvent("onSlideEnd",function(){
                valeurSeuils=valeursSliders(nbSliders);
                traceImpot(seuils,valeurSeuils);
            });
            sliders['slider'+j].init(); 
        }
        
    //Si l'utilisateur a cliqué sur un bouton
        $('#Ajustement').click(function(){
            ajusteCourbe();
            traceImpot(seuils,tauxCorriges);
        });
    }
    
    function valeursSliders(nbSliders) {
        var taux = new Array(nbSliders);
        for (i=0;i<nbSliders;i++) {
            taux[i]=sliders['slider'+i].getValue();
        }
        return taux;
    }
    
    function tauxImposition(seuils,valeursSeuils) {
        var nbSeuils=seuils.length;
        var taux= new Array(nbSeuils);
        for (i=0;i<nbSeuils;i++) {
            taux[i]=1-valeursSeuils[i]/seuils[i];
        }
        return taux;
    }
    
    function traceImpot(seuils,valeursSeuils) {
        var p=51, rep;
        donnees['nouvelImpot']=new Array(p);
        for (i=0;i<p;i++) {
            rep=i*50000000/(p-1);
            rev=variable2(rep,'repartition','revenu','revenuImposable');
            sAv=valeurAvant(rev,seuils);
            sAp=valeurApres(rev,seuils);
            tAv=valeurAvant(rev,valeursSeuils);
            tAp=valeurApres(rev,valeursSeuils);
            donnees['nouvelImpot'][i]={repartition: rep, revenu:ordonneeBarycentre(sAv,sAp,tAv,tAp,rev)};
        }
        traceGraphe('nouvelImpot');
    }
    
    function traceImpotActuel() {
        var rev;
        var nom='impotActuel';
        donnees[nom]=new Array(w);
        donnees[nom][0]={revenu:0, taux:0};
        for (i=1;i<w;i++) {
            rev=donnees['revenuFinal'][i].revenu;
            donnees[nom][i]={revenu:rev, taux:1-rev/revenuImposable(rev)};
        }
            //d�finition des axes
        var axeY = new cfx.FieldMap();
        axeY.setName("taux");
        axeY.setUsage(cfx.FieldUsage.Value);
        graphe[nom].getDataSourceSettings().getFields().add(axeY);
        var axeX = new cfx.FieldMap();
        axeX.setName("revenu");
        axeX.setUsage(cfx.FieldUsage.XValue);
        graphe[nom].getDataSourceSettings().getFields().add(axeX);
        graphe[nom].setDataSource(donnees[nom]);

    //configuration de la mise en forme
        //graphe[nom].getAxisX().setMax(2000);     
        graphe[nom].getAxisX().setMax(500000);
        graphe[nom].getAxisY().setMax(1);
        graphe[nom].getAllSeries().setMarkerShape(cfx.MarkerShape.None);
        graphe[nom].getAxisX().getGrids().getMajor().setVisible(true);
        graphe[nom].getAxisY().getGrids().getMajor().setVisible(true);
        var titreX, titreY;
        titreX = new cfx.TitleDockable();
        titreX.setText("Revenu Imposable");
        titreY = new cfx.TitleDockable();            
        titreY.setText("Impôts actuels");
        graphe[nom].getAxisY().setTitle(titreY);
        graphe[nom].getAxisX().setTitle(titreX);
        
        var div = document.getElementById('grapheTaux'); 
        grapheImpotActuel.create(div);
    }
    
    function revenuImposable(revenuFinal) {
        var repartition=variable2(revenuFinal,'revenu','repartition','revenuFinal');
        return variable2(repartition,'repartition','revenu','revenuImposable');        
    }
    
    function ligne(niveau, variable, donnee) { // retourne la première ligne où la variable (répartition ou revenu) est >= au niveau
        var i=0;
        while (i<w && donnees[donnee][i][variable]<niveau) {
            i++;
        }
        return i;
    }

    function variable2(niveauVariable1,variable1,variable2,donnee) { // retourne le niveau de variable2 en fonction de variable1
        var result;
        var temp=ligne(niveauVariable1,variable1,donnee);
        if (temp==0) {
            result = 0;
        }
        else {
            var y2=donnees[donnee][temp][variable2];
            var y1=donnees[donnee][temp-1][variable2];
            var x2=donnees[donnee][temp][variable1];
            var x1=donnees[donnee][temp-1][variable1];
            result = ordonneeBarycentre(x1,x2,y1,y2,niveauVariable1);
        }
        return result;
    }
    
    function enregistreSimulation(seuils,taux) {
        
    }
    
    function somme(morceau,ligne,donnees) {
        var S=0,i=0,l=donnees.length;
        if (morceau=='gauche') {
            while (i<ligne) {
                S+= donnees[i].densite*donnees[i].revenu;
                i++;
            }
        }
        else if (morceau=='droite') {
            while (i<l-ligne) {
                S+= donnees[l-i-1].densite*donnees[l-i-1].revenu;
                i++;
            }
        }
        else if (morceau=='tout') {
            while (i<l) {
                S+= donnees[i].densite*donnees[i].revenu;
                i++;
            }
        }
        return S;
    }
    
    function sommePonderee(morceau,ligne,donnees,seuils,taux) {
        var S=0,i=0,l=donnees.length,n=seuils.length,sC=1,rev;
        if (morceau=='gauche') {
            while (i<ligne) {
                rev=donnees[i].revenu;
                if (seuils[sC]<rev) {
                    sC++;
                }
                S+= donnees[i].densite*rev*(1-ordonneeBarycentre(seuils[sC-1],seuils[sC],taux[sC-1],taux[sC],rev));
                i++;
            }
        }
        else if (morceau=='droite') {
            i=l-ligne;
            while (i<l) {
                rev=donnees[i].revenu;
                if (seuils[sC]<rev) {
                    sC++;
                }
                S+= donnees[i].densite*rev*(1-ordonneeBarycentre(seuils[sC-1],seuils[sC],taux[sC-1],taux[sC],rev));
                i++;
            }
        }
        else if (morceau=='tout') {
            while (i<l) {
                rev=donnees[i].revenu;
                if (seuils[sC]<rev) {
                    sC++;
                }
                S+= donnees[i].densite*rev*(1-ordonneeBarycentre(seuils[sC-1],seuils[sC],taux[sC-1],taux[sC],rev));
                i++;
            }
        }
        return S;
    }
    
    function multiplieTableau(tab,x,taille,morceau) {
        if (morceau=='gauche') {
            for (i=0;i<taille-1;i++) {
                tab[i]*=x;
            }
        }
        else if (morceau=='droite') {
            for (i=1;i<taille;i++) {
                tab[i]*=x;
            }
        }
        else {
            for (i=0;i<taille;i++) {
                tab[i]*=x;
            }
        }
    }
    
    function ordonneeBarycentre(seuilAvant,seuilApres,tauxAvant,tauxApres,revenu) {
        return tauxAvant+(tauxApres-tauxAvant)*(revenu-seuilAvant)/(seuilApres-seuilAvant);
    }
    
    function impotActuel(ligne) {
        var nbr = donneesRevenuFinal[ligne].repartition, i=0;
        while (donneesRevenuImposable[i].repartition<nbr) {
            i++;
        }
        return 1-donneesRevenuFinal[ligne].revenu/donneesRevenuImposable[i].revenu;
    }
    
    function impotFutur(ligne,seuils,taux) {
        var r=donneesRevenuFinal[ligne];
        return ordonneeBarycentre(valeurAvant(r,seuils),valeurApres(r,seuils),valeurAvant(r,taux),valeurApres(r,taux),r);
    }
    
    function revenuInitial(ligne) {
        var rep=donneesRevenuFinal[ligne].repartition,i=0;
        while (donneesRevenuImposable[i].repartition<rep) {
            i++;
        }
        donneesRevenuImposable[i];
    }

    function valeurAvant(revenu,tab) { //seuilAvant < revenu
        var i=0;
        while (tab[i]<revenu) {
            i++;
        }
        return tab[i-1];
    }
    
    function valeurApres(revenu,tab) { //seuilApres >= revenu
        var i=0;
        while (tab[i]<revenu) {
            i++;
        }
        return tab[i];
    }
    
    function configureSlider(i) {
        var nom='slider'+i;
        if (i<8) {
            sliders[nom] = new dhtmlxSlider(nom, {
                skin: "dhx_skyblue",
                min: 37500,
                max: 0,
                step: 125,
                size: 160,
                vertical: true,
                value: Math.floor(variable2(5000000*i,'repartition','revenu','revenuFinal')/78)*78
            });            
        }
        else if (i==10) {
            sliders[nom] = new dhtmlxSlider(nom, {
                skin: "dhx_skyblue",
                min: 150000,
                max: 0,
                step: 500,
                size: 604,
                vertical: true,
                value:variable2(5000000*i,'repartition','revenu','revenuFinal')
            });                
        }
        else if (i<10 && i>7) {
            sliders[nom] = new dhtmlxSlider(nom, {
                skin: "dhx_skyblue",
                min: 65625,
                max: 0,
                step: 125,
                size: 271,
                vertical: true,
                value:variable2(5000000*i,'repartition','revenu','revenuFinal')
            });            
        }
    }
});






 