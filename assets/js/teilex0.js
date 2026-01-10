document.addEventListener("DOMContentLoaded", function (event) {
    
    const getMenuSelections = () => {
        const existing = localStorage.getItem('menu-selections');
        return existing ? existing.split(',').filter(Boolean) : [];
    };
    
    const setMenuSelections = (ids) => {
        localStorage.setItem('menu-selections', ids.filter(Boolean).toString());
    };
    
    const setMenuOpen = (showhide, open) => {
        if (!showhide) return;
        const plusminus = showhide.querySelector('.plusminus');
        const continued = showhide.nextElementSibling && showhide.nextElementSibling.classList.contains('continuedtoc')
            ? showhide.nextElementSibling
            : showhide.parentElement && showhide.parentElement.querySelector("div.continuedtoc");
        
        if (continued && continued.style) {
            continued.style.display = open ? 'block' : 'none';
        }
        
        if (plusminus && plusminus.classList) {
            plusminus.classList.toggle('clicked', open);
            if (plusminus.id) {
                const selections = getMenuSelections();
                const next = open
                    ? Array.from(new Set([...selections, plusminus.id]))
                    : selections.filter((id) => id !== plusminus.id);
                setMenuSelections(next);
            }
        }
    };
    
    // was menu open?
    getMenuSelections().forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const showhide = el.closest('div.toc-showhide');
        setMenuOpen(showhide, true);
    });
    
    // Only the +/- control should toggle submenus (toc-showhide itself is not clickable).
    
    document.querySelectorAll('.plusminus').forEach(item => {
        item.addEventListener('click', event => {
            event.stopPropagation();
            const showhide = item.closest('div.toc-showhide');
            if (!showhide) return;
            const continued = showhide.nextElementSibling && showhide.nextElementSibling.classList.contains('continuedtoc')
                ? showhide.nextElementSibling
                : showhide.parentElement && showhide.parentElement.querySelector("div.continuedtoc");
            if (!continued) return;
            const open = window.getComputedStyle(continued).display !== 'block';
            setMenuOpen(showhide, open);
        })
    })
    
    document.querySelectorAll('pre').forEach(item => {
        
        item.querySelectorAll('.egXML_invalid').forEach(child => {
            item.classList.add('egXML_invalid');
            item.closest('.tab-content').classList.add('egXML_invalid');
            /*if (item.nextElementSibling.classList.contains('toolbar')) {
             console.log(item);
             Array.prototype.slice.call(item.nextElementSibling.querySelectorAll(".copy_button")).forEach(cp => {
             cp.style.disply='none';
             })
            
             } else {
             console.log("none");
             }*/
        });
    });
    
    
    /*open first example in example sets*/
     /*document.querySelectorAll('.examples .tab input')[0].checked = true;*/
     /* document.querySelectorAll('.tabs').forEach(set => {
     set.querySelector('.tab').querySelector('input').checked = true;
     });*/
    
    
     /*get spec */
     /*   var bib = document.getElementById('bibliography');
     var temp = document.createElement('span');
     temp.setAttribute("id", "get");
     var get = bib.parentNode.insertBefore(temp, bib.nextSibling);
     var xhr = new XMLHttpRequest();
     xhr.open('GET', 'spec.html');
     xhr.onload = function () {
     if (xhr.status === 200) {
     get.innerHTML = xhr.response;
     Prism.highlightAllUnder(get);
     } else {
     console.log('Request failed.  Returned status of ' + xhr.status);
     }
     };
     xhr.send();*/
     
    document.querySelectorAll('.tab').forEach(current => {
        var next = current.nextElementSibling;
        if (next && next.classList.contains('tab') ) {
            current.classList.add('drop');
        } 
    });
        
});

document.querySelectorAll('.tabs').forEach(set => {
    const tab = set.querySelector('.tab');
    const input = tab ? tab.querySelector('input') : null;
    if (input) {
        input.checked = true;
    }
});


 
