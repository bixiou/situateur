$(document).ready(function($) {
    var grapheRevenuFinal = new cfx.Chart();
    grapheRevenuFinal.setGallery(cfx.Gallery.Lines);
    var grapheRevenuImposable = new cfx.Chart();
    grapheRevenuImposable.setGallery(cfx.Gallery.Lines);
    var grapheImpotActuel = new cfx.Chart();
    grapheImpotActuel.setGallery(cfx.Gallery.Lines);
    var grapheNouvelImpot= new cfx.Chart();
    grapheNouvelImpot.setGallery(cfx.Gallery.Lines);
    var grapheTauxImpot= new cfx.Chart();
    grapheTauxImpot.setGallery(cfx.Gallery.Lines);
    var grapheTauxComplet = new cfx.Chart();
    grapheTauxComplet.setGallery(cfx.Gallery.Lines);
    var grapheRepartitionComplet = new cfx.Chart();
    grapheRepartitionComplet.setGallery(cfx.Gallery.Lines);
    var graphe = { "revenuImposable":grapheRevenuImposable, "revenuFinal":grapheRevenuFinal, "impotActuel":grapheImpotActuel, "nouvelImpot":grapheNouvelImpot, "tauxImpot":grapheTauxImpot, "tauxComplet":grapheTauxComplet, "repartitionComplet":grapheRepartitionComplet};
    var donneesRevenuFinal, donneesRevenuImposable, donneesImpotActuel, donneesNouvelImpot, donneesTauxImpot;
    var w=749, sliders = new Array, seuils, valeursSeuils, taux, nbSliders ;
    var donnees = {"revenuImposable":donneesRevenuImposable, "revenuFinal":donneesRevenuFinal, "impotActuel":donneesImpotActuel, "nouvelImpot":donneesNouvelImpot, "tauxImpot":donneesTauxImpot};
    
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
            $('body').trigger('transparence');
        },
        error: function(){ alert('Les donn�es n\'ont pas pu �tre charg�es');}
    });
    
    $('body').on('attendAutreGraphe',function () {
        $('body').on('chargeImpot',function(){
            chargeTauxImpotActuel();
            traceGrapheComplet('tauxComplet');
            traceGrapheComplet('repartitionComplet');
            compareRevenu();
        });
    });

    $('body').on('transparence',function () {  
        var modifiedCode = $("#revenuImposable").html().replace(/fill-opacity:0.2/g,"fill-opacity:0.00");
        $("#revenuImposable").html(modifiedCode); 
        var modifiedCode = $("#revenuFinal").html().replace(/fill-opacity:0.2/g,"fill-opacity:0.00");
        $("#revenuFinal").html(modifiedCode);
        var modifiedCode = $("#tauxImpot").html().replace(/fill-opacity:0.2/g,"fill-opacity:0.00");
        $("#tauxImpot").html(modifiedCode);
        var modifiedCode = $("#impotActuel").html().replace(/fill-opacity:0.2/g,"fill-opacity:0.00");
        $("#impotActuel").html(modifiedCode);
    });
    
    function ajusteCourbe() {
        var ligneF, ligneI, T, a, seuilA, rA, n=nbSliders, temp;
        var tauxAvecA = new Array(n+1), seuilsAvecA = new Array(n+1);
        var nouvellesValeursSeuils = new Array(n+1);
        var l= donnees['revenuFinal'].length, sommeActuelleGauche, sommeActuelleDroite;
        var valeursSeuilsRabotes = new Array(n+1);

        $('#features').replaceWith('<div id="features"></div>');
        a=determineA();
        seuilA=insereSeuilA();
        T=determineT();
        dichotomie('gauche');
        dichotomie('droite');  
        traceRepartitionImpot(seuilsAvecA,nouvellesValeursSeuils);
        temp=0;
        for (i=0;i<n+1;i++) {
            taux[i+temp]=1-nouvellesValeursSeuils[i+temp]/seuils[i+temp];
            if (i==seuilA) {   temp--;  }
        }
        var rb=nouvellesValeursSeuils[0]/12;
        $('<span>Revenu de base instauré par la réforme : '+rb.toFixed(0)+' €/mois</span>').appendTo($('#features'));
        //verifieConditions();
                
        function determineA() {
            var i=0;
            while(i<l && donnees['revenuFinal'][i].revenu<=variable2(donnees['revenuFinal'][i].repartition,'repartition','revenu','nouvelImpot')) {
                i++;
            }    
            ligneF=i;
            ligneI=donnees['revenuFinal'][i].repartition;
            i=0;
            while (i<l && donnees['revenuImposable'][i].repartition<ligneI) {
                i++;
            }
            ligneI=i;
            var a=donnees['revenuFinal'][ligneF].repartition;
            rA=donnees['revenuFinal'][ligneF].revenu;
            var prop=a/503600;
            $('<span>Proportion d\'adultes français avantagés par la réforme : '+prop.toFixed(0)+'%</span></br>').appendTo($('#features'));
            return a;
        }
        
        function insereSeuilA() {
            var i=0,temp=0,result;
            var revA=variable2(a,'repartition','revenu','revenuImposable');
            var rev2=revenu2(revA,'revenuImposable','revenuFinal');
            
            for (j=0;j<n;j++) {
                if (seuils[Math.max(0,j-1)]<revA && seuils[j]>=revA) {
                    temp=1;
                    seuilsAvecA[j]=revA;
                    result=j;
                    tauxAvecA[j]=rev2/revA;
                    nouvellesValeursSeuils[j]=rev2;
                    valeursSeuilsRabotes[j]=nouvellesValeursSeuils[j];  
                }
                seuilsAvecA[j+temp]=seuils[j];
                tauxAvecA[j+temp]=taux[j];
                nouvellesValeursSeuils[j+temp]=valeursSeuils[j];
                valeursSeuilsRabotes[j+temp]=nouvellesValeursSeuils[j];  
            }
            return result;
        }
        
        function determineT(){
            var tGauche= sommePondereeImposable('gauche');
            sommeActuelleGauche=sommeFinal('gauche');
            tGauche-=sommeActuelleGauche;
            sommeActuelleDroite=sommeFinal('droite');
            var tDroit=sommeActuelleDroite-sommePondereeImposable('droite');
            var T=(tGauche+tDroit)/2;
            var tra=T/1000000000;
            $('<span>Transfert d\'argent des riches vers les pauvres lors de la réforme : '+tra.toFixed(0)+' milliards d\'euros</span></br>').appendTo($('#features'));
            return T;
        }
        
        function dichotomie(morceau) {
            var sommeActuelle;
            (morceau=='gauche') ? sommeActuelle = sommeActuelleGauche : sommeActuelle = sommeActuelleDroite;
            if (morceau=='droite') { T=-T; };
            var precision=Math.pow(10,10),t=1,incr=0.5;
            var sommeFuture=sommePondereeImposable(morceau);
            var signe=sign(sommeActuelle+T-sommeFuture);
            var cond=0;
            if ((morceau=='gauche' &&  signe==-1) || (signe==1 && morceau=='droite')) { cond=1; }
            for (j=0;j<n+1;j++) {
                 if (cond) {
                     valeursSeuilsRabotes[j]=nouvellesValeursSeuils[j]-revenu2(seuilsAvecA[j],'revenuImposable','revenuFinal'); alert(valeursSeuilsRabotes[j]);
                 }
                 else {
                     valeursSeuilsRabotes[j]=nouvellesValeursSeuils[j]-rA;
                 }                
            }
            
            multiplieTableau(0,cond,morceau); traceRepartitionImpot(seuilsAvecA,nouvellesValeursSeuils);
            if ((signe==1 && (sommeActuelle+T-sommePondereeImposable(morceau))>0) || (signe==-1 && (sommeActuelle+T-sommePondereeImposable(morceau))<0))  {
                alert('ajustement impossible');
            }
            else {
                while (Math.abs(sommeActuelle+T-sommeFuture)>precision && incr>0.00001 && incr<0.99999) {
                    (sommeActuelle+T>sommeFuture) ? t-=signe*incr : t+=signe*incr ;
                    multiplieTableau(t,cond,morceau);
                    sommeFuture=sommePondereeImposable(morceau);
                    incr/=2;
                }
                multiplieTableau(t,cond,morceau);                
            }
        } 
        
        function verifieConditions(){
            var iA,iF,alerte=1;
            if (T<0) {
                alert('Votre proposition inclue un transfert d\'argent des pauvres vers les riches, nous ne la retenons pas.');
                alerte=0;
            }
            for (i=1;i<n;i++) {
                if (tauxAvecA[i]>tauxAvecA[i+1]) {
                    alert('Votre proposition ne conduit pas à un impôt progressif : en effet, les revenus au seuil n°'+i+' sont imposés à '+tauxAvecA[i].toFixed(1)+'% tandis qu\'au seuil suivant ils sont imposés à '+tauxAvecA[i+1].toFixed(1)+'%. Nous ne retenons donc pas votre proposition.');
                    alerte=0;
                    break;
                }
            }
            for (i=0;i<l;i++) {
                iA=100*impotActuel(i);
                iF=100*impotFutur(i,tauxAvecA);
                if ((iA<iF && i<ligneF) || (iA>iF && i>ligneF) || (iF>impotFutur(i+1,tauxAvecA))) {
                    alert('Votre proposition n\'est pas socialement juste : comparez l\'impôt actuel ('+iA.toFixed(1)+'%) et l\'impôt proposé ('+iF.toFixed(1)+'%) pour un revenu de '+donnees['revenuFinal'][i].revenu+'€ par exemple. Nous ne retenons pas votre proposition.');
                    alerte=0;
                    break;
                }
            }
            if (alerte) {
                alert('Votre proposition vérifie les contraintes.');
            }
        }    
        
        function multiplieTableau(x,cond,morceau) {       
            var min, max;
            if (morceau=='gauche') {
                min=0;
                max=seuilA;
            }
            else if (morceau=='droite') {
                min=seuilA+1;
                max=n+1;
            }
            if (cond) {
                for (i=min;i<max;i++) {
                    nouvellesValeursSeuils[i]=revenu2(seuilsAvecA[i],'revenuImposable','revenuFinal')+valeursSeuilsRabotes[i]*x; alert(valeursSeuilsRabotes[i]);
                }                
            }
            else {
                for (i=min;i<max;i++) {
                    nouvellesValeursSeuils[i]=rA+valeursSeuilsRabotes[i]*x;
                }                
            }
        }
                
        function sommePondereeImposable(morceau) {
            var donnee='revenuImposable';
            var S=0,i=0,l=donnees[donnee].length,sC=1,rev;
            if (morceau=='gauche') {
                while (i<ligneI) {
                    rev=donnees[donnee][i].revenu;
                    while (seuilsAvecA[sC]<rev) {
                        sC++;
                    }
                    S+= donnees[donnee][i].densite*ordonneeBarycentre(seuilsAvecA[sC-1],seuilsAvecA[sC],nouvellesValeursSeuils[sC-1],nouvellesValeursSeuils[sC],rev);
                    i++;
                }
            }
            else if (morceau=='droite') {
                i=ligneI;
                while (i<l) {
                    rev=donnees[donnee][i].revenu;
                    while (seuilsAvecA[sC]<rev) {
                        sC++;
                    }
                    S+= donnees[donnee][i].densite*ordonneeBarycentre(seuilsAvecA[sC-1],seuilsAvecA[sC],nouvellesValeursSeuils[sC-1],nouvellesValeursSeuils[sC],rev);
                    i++;
                }
            }
            else if (morceau=='tout') {
                while (i<l) {
                    rev=donnees[donnee][i].revenu;
                    while (seuilsAvecA[sC]<rev) {
                        sC++;
                    }
                    S+= donnees[donnee][i].densite*ordonneeBarycentre(seuilsAvecA[sC-1],seuilsAvecA[sC],nouvellesValeursSeuils[sC-1],nouvellesValeursSeuils[sC],rev);
                    i++;
                }
            }
            return S;
        }      
            
        function sommeFinal(morceau) {
            var donnee='revenuFinal';
            var S=0,i=0,l=donnees[donnee].length;
            if (morceau=='gauche') {
                while (i<ligneF) {
                    S+= donnees[donnee][i].densite*donnees[donnee][i].revenu;
                    i++;
                }
            }
            else if (morceau=='droite') {
                while (i<l-ligneF) {
                    S+= donnees[donnee][l-i-1].densite*donnees[donnee][l-i-1].revenu;
                    i++;
                }
            }
            else if (morceau=='tout') {
                while (i<l) {
                    S+= donnees[donnee][i].densite*donnees[donnee][i].revenu;
                    i++;
                }
            }
            return S;
        }
     
    }
    
    function simuleImpot() {
            //Création des sliders
        var temp;
        nbSliders=12;
        seuils  =  new Array(nbSliders);
        valeursSeuils = new Array(nbSliders);
        
        for (j=0;j<nbSliders-1;j++) {
            seuils[j]=variable2(5000000*j,'repartition','revenu','revenuImposable');
            valeursSeuils[j]=variable2(5000000*j,'repartition','revenu','revenuFinal');
            configureSlider(j);
        }
        seuils[nbSliders-1]=donnees['revenuImposable'][donnees['revenuImposable'].length-1].revenu
        valeursSeuils[nbSliders-1]=donnees['revenuFinal'][donnees['revenuFinal'].length-1].revenu;
        configureSlider(nbSliders-1);
            //Création du graphe des taux
        donnees['tauxImpot'] = new Array(nbSliders);
        taux=tauxImposition();
        chargeTauxImpot(taux);
        chargeTableImpot(0);
        traceTauxImpot('tauxImpot');
        traceRepartitionImpot(seuils,valeursSeuils);
        
            //Mise à jour lors du déplacement d'un curseur
        for (j=0;j<nbSliders;j++) {
            enregistrePosition(j);
            sliders['slider'+j].attachEvent("onSlideEnd",function(pos,slider){
                traceRepartitionImpot(seuils,valeursSeuils);
                if (donnees['tauxImpot']!=undefined) {
                    taux=tauxImposition();
                    chargeTauxImpot(taux);
                    chargeTableImpot(1);
                    graphe['tauxImpot'].getDataSourceSettings().reloadData();
                }
            });
        }
            //Appel à l'ajustement lorsque le bouton est cliqué
        $('#Ajustement').click(function(){
            ajusteCourbe();
            $('#CalculeNouveauRevenu').trigger('click');
            chargeTableImpot(1);
        });
         
        function enregistrePosition(j) {
                sliders['slider'+j].attachEvent("onSlideEnd",function(pos,slider){
                valeursSeuils[j]=pos;
            });
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
                    value: valeursSeuils[i]
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
                    value:valeursSeuils[i]
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
                    value:valeursSeuils[i]
                });            
            }
            else if (i==11) {
                sliders[nom] = new dhtmlxSlider(nom, {
                    skin: "dhx_skyblue",
                    min: donnees['revenuImposable'][donnees['revenuImposable'].length-1].revenu,
                    max: 0,
                    step: 500,
                    size: 604,
                    vertical: true,
                    value:valeursSeuils[i]
                });                
            }
            sliders['slider'+i].init(); 
        }
        
        function chargeTableImpot(init) {
            var tauxP, tauxI;
            if (!init) {
                $('<tr><th>Revenu imposable</th><th>Taux actuels</th></tr>').appendTo($('#taux'));
                for (i=0;i<nbSliders;i++){
                    tauxP=100*taux[i];
                    $('<tr><td>'+seuils[i].toFixed(0)+'</td><td>'+tauxP.toFixed(1)+'%</td></tr>').appendTo($('#taux'));
                }
            }
            else {
                $('#taux').replaceWith('<table id="taux"><tr><th>Revenu imposable</th><th>Taux actuels</th><th>Nouveaux taux</th></tr></table>');
                for (i=0;i<nbSliders;i++){
                    tauxP=100*taux[i];
                    tauxI=100*(1-revenu2(seuils[i],'revenuImposable','revenuFinal')/seuils[i]);
                    $('<tr><td>'+seuils[i].toFixed(0)+'</td><td>'+tauxI.toFixed(1)+'%</td><td>'+tauxP.toFixed(1)+'%</td></tr>').appendTo($('#taux'));
                }
            }
        }

    }
        
    function enregistreSimulation() {
        
    }
    
    function compareRevenu() {
        $('#CalculeNouveauRevenu').click(function() {
            var revenu=$('#revenuActuel').val();
            revenu=revenu2(revenu,'revenuFinal','nouvelImpot');
            $('#nouveauRevenu').text('Nouveau revenu final : '+revenu+' €');
        });
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
        graphe[nom].getAxisX().setStep(5000000);
        graphe[nom].getAxisX().setScaleUnit(1000000);
        graphe[nom].setBackColor('#00FFFFFF');
        graphe[nom].getLegendBox().setHeight(70);
        graphe[nom].getLegendBox().setTextColor("#4281A4");
        graphe[nom].getLegendBox().setMarginX(70);
        graphe[nom].getLegendBox().setFont("12pt Arial");
        var titreX, titreY;
        titreX = new cfx.TitleDockable();
        titreX.setText("Nombre d\'adultes français ayant un revenu final inférieur à l\'ordonnée correspondante (en millions)");
        graphe[nom].getAxisX().setTitle(titreX);
        titreY = new cfx.TitleDockable();            
        titreY.setText(nom);
        graphe[nom].getLegendBox().setDock(cfx.DockArea.Top);
        graphe[nom].getSeries().getItem(0).setText("revenu imposable");
        if (nom=='revenuFinal') {
            graphe[nom].getSeries().getItem(0).setText("revenu final avant la réforme");
            graphe[nom].getSeries().getItem(0).setColor("#FF0000");
            graphe[nom].getLegendBox().setTextColor("#FF0000");
            graphe[nom].getAxisX().getGrids().getMajor().setVisible(true);
            graphe[nom].getAxisY().getGrids().getMajor().setVisible(true);
            graphe[nom].getLegendBox().setMarginX(250);
        }
        if (nom=='nouvelImpot') {
            graphe[nom].getSeries().getItem(0).setText("revenu final après la réforme");
            graphe[nom].getLegendBox().setTextColor("#008000");
            graphe[nom].getSeries().getItem(0).setColor("#008000");
            graphe[nom].getLegendBox().setMarginX(250);
            graphe[nom].getLegendBox().setMarginY(25);
            graphe[nom].setBackColor('#FFFFFF'); 
        }
     
        var div = document.getElementById(nom); 
        graphe[nom].create(div);
    }    
    
    function traceRepartitionImpot(seuils,valeursSeuils) { 
        var nom='nouvelImpot', p=501;
        if (donnees[nom]==undefined) {
            donnees[nom]=new Array(p);
            chargeDonneesImpot(seuils,valeursSeuils);
            traceGraphe(nom);
        }
        else {
            chargeDonneesImpot(seuils,valeursSeuils);
            graphe[nom].getDataSourceSettings().reloadData();
        }
    }
    
    function traceTauxImpot(nom) {
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
        graphe[nom].getAxisX().setMax(120000);
        graphe[nom].getAxisY().setMax(1);
        graphe[nom].getAxisY().setMin(-0.2);
        graphe[nom].getAxisY().setStep(0.1);
        graphe[nom].getAllSeries().setMarkerShape(cfx.MarkerShape.None);
        graphe[nom].getSeries().getItem(0).setText("taux d'imposition avant la réforme");
        graphe[nom].getLegendBox().setDock(cfx.DockArea.Top);
        graphe[nom].setBackColor('#00FFFFFF');
        var titreX;
        graphe[nom].getAxisX().setTitle(titreX);
        graphe[nom].getAxisY().getLabelsFormat().setFormat(cfx. AxisFormat.Percentage);
        graphe[nom].getLegendBox().setFont("12pt Arial");
        if (nom=='tauxImpot') {
            graphe[nom].getAxisX().getGrids().getMajor().setVisible(true);
            graphe[nom].getAxisY().getGrids().getMajor().setVisible(true);
            titreX = new cfx.TitleDockable();
            titreX.setText("Revenu Imposable");
            titreY = new cfx.TitleDockable();            
            titreY.setText("Taux d'imposition");

            graphe[nom].getSeries().getItem(0).setColor("#008000");  
            graphe[nom].getSeries().getItem(0).setText("taux d'imposition après la réforme");
            graphe[nom].getLegendBox().setTextColor("#008000");
            graphe[nom].getLegendBox().setMarginX(300);
        }
        
        var div = document.getElementById(nom); 
        graphe[nom].create(div);
    }

    function traceGrapheComplet(nom) {
        var axeY = new cfx.FieldMap();
        var axeX = new cfx.FieldMap();
        
        if (nom=='repartitionComplet') {
            axeY.setName("revenu");
            axeY.setUsage(cfx.FieldUsage.Value);
            graphe[nom].getDataSourceSettings().getFields().add(axeY);
            axeX.setName("repartition");
            axeX.setUsage(cfx.FieldUsage.XValue);
            graphe[nom].getDataSourceSettings().getFields().add(axeX);            
            graphe[nom].setDataSource(donnees['revenuImposable']);
        }
        else if (nom=='tauxComplet') {
            axeY.setName("taux");
            axeY.setUsage(cfx.FieldUsage.Value);
            graphe[nom].getDataSourceSettings().getFields().add(axeY);
            axeX.setName("revenu");
            axeX.setUsage(cfx.FieldUsage.XValue);
            graphe[nom].getDataSourceSettings().getFields().add(axeX);
            graphe[nom].setDataSource(donnees['impotActuel']);
        }

    //configuration de la mise en forme
        graphe[nom].getAllSeries().setMarkerShape(cfx.MarkerShape.None);
        graphe[nom].getAxisX().getGrids().getMajor().setVisible(true);
        graphe[nom].getAxisY().getGrids().getMajor().setVisible(true);
        var titreX, titreY;
        titreX = new cfx.TitleDockable();
        titreX.setText("");
        titreY = new cfx.TitleDockable();            
        titreY.setText(nom);
        graphe[nom].getAxisY().setTitle(titreY);
        graphe[nom].getAxisX().setTitle(titreX);
     
        var div = document.getElementById(nom); 
        graphe[nom].create(div);        
    }
    
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
    
    function chargeDonneesImpot(seuils,valeursSeuils) {
        var rep, rev, sAv, sAp, tAv, tAp, ind, nom='nouvelImpot';
        var p=donnees[nom].length;
        for (i=0;i<p;i++) {
            rep=i*50000000/(p-1);
            rev=variable2(rep,'repartition','revenu','revenuImposable');
            sAv=valeurAvant(rev,seuils);
            sAp=valeurApres(rev,seuils);
            ind=indiceApres(rev,seuils);
            tAv=valeursSeuils[Math.max(0,ind-1)];
            tAp=valeursSeuils[ind];
            donnees[nom][i]={repartition: rep, revenu:ordonneeBarycentre(sAv,sAp,tAv,tAp,rev)};
         }
    }
        
    function chargeTauxImpot(tauxI) {
        var n=tauxI.length;
        for (i=0;i<n;i++) {
            donnees['tauxImpot'][i]={revenu:seuils[i], taux:tauxI[i]}; 
        }
        donnees['tauxImpot'][0].taux=-1;
    }    
    
    function chargeTauxImpotActuel() {
        var rev;
        var nom='impotActuel';
        donnees[nom]=new Array(w);
        donnees[nom][0]={revenu:0, taux:0};
        for (i=1;i<w;i++) {
            rev=donnees['revenuImposable'][i].revenu;
            donnees[nom][i]={revenu:rev, taux:1-revenu2(rev,'revenuImposable','revenuFinal')/rev};
        }
        traceTauxImpot(nom);
    }
        
    function impotActuel(ligne) {
        var nbr = donnees['revenuFinal'][ligne].repartition, i=0;
        while (donnees['revenuImposable'][i].repartition<nbr) {
            i++;
        }
        return 1-donnees['revenuFinal'][ligne].revenu/donnees['revenuImposable'][i].revenu;
    }
    
    function impotFutur(ligne,taux) {
        var r=donnees['revenuFinal'][ligne];
        return ordonneeBarycentre(valeurAvant(r,seuils),valeurApres(r,seuils),valeurAvant(r,taux),valeurApres(r,taux),r);
    }
    
    function indiceApres(revenu,tab) { //seuilApres >= revenu
        var i=0;
        while (tab[i]<revenu) {
            i++;
        }
        return i;
    }     
    
    function valeurAvant(revenu,tab) { //seuilAvant < revenu
        var i=0;
        while (tab[i]<revenu) {
            i++;
        }
        return tab[Math.max(0,i-1)];
    }
    
    function valeurApres(revenu,tab) { //seuilApres >= revenu
        var i=0;
        while (tab[i]<revenu) {
            i++;
        }
        return tab[i];
    }
         
    function sign(nombre) {
        if (nombre==0) {
            return 0;
        }
        else {
            return nombre/Math.abs(nombre);
        }
    }
    
    function ordonneeBarycentre(seuilAvant,seuilApres,tauxAvant,tauxApres,revenu) {
        var result=tauxAvant+(tauxApres-tauxAvant)*(revenu-seuilAvant)/(seuilApres-seuilAvant);
        if (seuilApres==seuilAvant) {
            result=0;
        }
        return result;
    }
    
    function revenu2(niveau1,revenu1,revenu2) {
        var repartition=variable2(niveau1,'revenu','repartition',revenu1);
        return variable2(repartition,'repartition','revenu',revenu2);        
    }
    
    function tauxImposition() {
        var nbSeuils=seuils.length;
        var taux= new Array(nbSeuils);
        for (i=0;i<nbSeuils;i++) {
            if (seuils[i]==0) {
                taux[i]=-1;
            }
            else {
            taux[i]=1-valeursSeuils[i]/seuils[i];                
            }
        }
        return taux;
    }
    
    function variable2(niveauVariable1,variable1,variable2,donnee) { // retourne le niveau de variable2 en fonction de variable1
        var result;
        var i=0;
        i=ligne();
        if (i==0) {
            result = 0;
        }
        else {
            var y2=donnees[donnee][i][variable2];
            var y1=donnees[donnee][i-1][variable2];
            var x2=donnees[donnee][i][variable1];
            var x1=donnees[donnee][i-1][variable1];
            result = ordonneeBarycentre(x1,x2,y1,y2,niveauVariable1);
        }
        return result;
        
        function ligne() { // retourne la première ligne où la variable (répartition ou revenu) est >= au niveau
            while (i<w && donnees[donnee][i][variable1]<niveauVariable1) {
                i++;
            }
            return i;
        }
    }

});
