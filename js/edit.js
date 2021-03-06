/*!
 * Copyright 2016 Everex https://everex.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var NewLocales = {};
var hasChanges = false;

window.onbeforeunload = function(e) {
    return hasChanges ? 'You have ' + oLE.getChangesCount() + ' unsaved changes!\nAre you sure you want to discard them?' : null;
};

var daysLock = 7; // If eng was changed more than 7 days ego - disable change other locales

var TIMER = {
    timeLoaded: 0,
    timeLeft: 30
}

var LocalesEditor = function(){
    var container;
    TIMER.timeLoaded = new Date().getTime(); // time loaded
    TIMER.timeLeft = 30; // minutes left
    var mtime = 0;
    $.get('check.php', function(data){
        console.log('Load locales modify time: ' + data);
        mtime = data;
    });

    var langs = ['en', 'th'];
    var lang = 'en';
    var langColors = {
        en: '#ffaa99',
        th: '#99ffaa'
    }
    
    var openedSections = {};
    var changedLocales = {};
    
    this.getChangesCount = function(){
        var count = 0;
        for(var lang in changedLocales){
            for(change in changedLocales[lang]){
                if(changedLocales[lang][change]){
                    count++;
                }
            }
        }
        return count;
    }
    
    this.init = function(id){
        this.compileChanges();

        if(localStorage.getItem('lang') && langs.indexOf(localStorage.getItem('lang')) >= 0){
            lang = localStorage.getItem('lang');
            $('#select-lang').val(lang);
        }
        this.setLang(lang);
        
        if(localStorage.getItem('openedSections')){
            openedSections = JSON.parse(localStorage.getItem('openedSections'));
        }
        
        NewLocales = $.extend({}, Locales);
        
        container = $('#' + id);
        this.drawTree();
        
        $('#select-lang').change(function(ed){
            return function(){
                ed.setLang($('#select-lang').val());
                ed.drawTree();
                ed.updateFiler();
            }
        }(this));
        
        $(window).keydown(function(ed){
            return function(event) {
                if (!(event.which == 83 && event.ctrlKey) && !(event.which == 19)) return true;
                ed.save();
                event.preventDefault();
                return false;
            }
        }(this));
        
        $('#changes-after-date').change(this.updateFiler);

        setInterval(function(){
            if(!TIMER.timeLeft){
                return;
            }
            var secLeft = (30 * 60) - Math.round(((new Date).getTime() - TIMER.timeLoaded) / 1000);
            var timeLeft = Math.ceil(secLeft / 60);
            var minutes = Math.floor(secLeft / 60);
            var seconds = secLeft - minutes * 60;
            if(seconds < 10){
                seconds = '0' + seconds;
            }
            if(timeLeft <= 0){
                timeLeft = 0;
                minutes = '0';
                seconds = '00';
            }
            TIMER.timeLeft = timeLeft;
            $('#timer').html(minutes + ':' + seconds);
            var fsize = 14;
            if(timeLeft < 15){
                fsize = 29 - timeLeft;
                $('#timer').css('color', 'rgb(' + (255 - (timeLeft * 8)) + ', 0, 0)');
            }
            $('#timer').css('font-size', fsize + 'px');
        }, 500);
    };
    
    this.updateFiler = function(){
        var date = $('#changes-after-date').val();
        var shown = 0;
        $('.locale-row').each(function(i, e){
            var date = $('#changes-after-date').val();
            if($(e).attr('data-last-change') < date){
                $(e).hide();
            }else{
                $(e).show();
                shown++;
            }
        });
        $('#date-filtered-count').text('(' + shown + ')');
    }
    
    this.compileChanges = function(){
        for(var section in Locales){
            if('undefined' === typeof(LocalesChanges[section])){
                LocalesChanges[section] = {};
            }
            for(var langvar in Locales[section]){
                if('undefined' === typeof(LocalesChanges[section][langvar])){
                    LocalesChanges[section][langvar] = {};
                }
                for(var language in Locales[section][langvar]){
                    if('undefined' === typeof(LocalesChanges[section][langvar][language])){
                        LocalesChanges[section][langvar][language] = new Date().getTime();
                    }
                }
            }
        }
    }

    this.setLang = function(language){
        lang = language;
        localStorage.setItem('lang', lang);
        $('#select-lang, body').css('background-color', langColors[lang]);
    }

    this.drawTree = function(){
        container.empty();
        for(var section in Locales){
            addSection(section);
            addSectionForm(section);
            updateStats();
        }
    }

    var updateStats = function(){
        var totalVars = 0;
        var totalChanged = 0;
        var totalEmpty = 0;
        $("input, textarea").removeClass('var-empty');
        $("input, textarea").filter(function(){
            return !this.value;
        }).addClass('var-empty');
        for(var section in Locales){
            var totalCount = $('#section-' + section + ' .locale-row').length;
            var changesCount = $('#section-' + section + ' .locale-row.changed').length;
            var emptyCount = $('#section-' + section + ' .var-empty').length;
            var total = totalCount + ' vars'
            var changed = changesCount ? (', ' + changesCount + ' changed') : '';
            var empty = emptyCount ? (', ' + emptyCount + ' empty') : '';
            $('#section-changes-' + section).html(total + empty + changed);
            totalVars += totalCount;
            totalChanged += changesCount;
            totalEmpty += emptyCount;
            $('.var-stats').html(totalVars + ' vars<Br/>' + totalEmpty + ' empty<br />' + totalChanged + ' changed');
        }
    }

    this.download = function(){
        _download('locales.js', 'Locales = ' + JSON.stringify(NewLocales, null, 4));
    }
    
    this.save = function(){
        if(!TIMER.timeLeft){
            if(confirm('Version is outdated. Refresh the page?')){
                document.location.reload();
            }
            return;
        }
        if($('.error').length){
            alert('Please fix all errors first!');
            return;
        }
        if(hasChanges){
            if(lang == 'en'){
                $('.changed input, .changed textarea').each(function(i, e){
                    var section = $(e).attr('data-section');
                    var locale = $(e).attr('data-locale');
                    LocalesChanges[section][locale]['en'] = new Date().getTime();
                });
            }

            if(lang == 'th'){
                $('.changed input, .changed textarea').each(function(i, e){
                    var section = $(e).attr('data-section');
                    var locale = $(e).attr('data-locale');
                    LocalesChanges[section][locale]['th'] = new Date().getTime();
                });
            }

            showLoader();
            $.get('check.php', function(data){
                console.log('Check locales modify time: ' + data);
                if(mtime != data){
                    console.log(data + ' != ' + mtime);
                    hideLoader();
                    alert('Locales were changed by another user! Can\'t save!');
                    return;
                }
                $.post('save.php', {ver: '1', locale: 'Locales = ' + JSON.stringify(NewLocales, null, 4)}, function(data){
                    if(data == 'OK'){
                        $.post('save.php', {changes: 'LocalesChanges = ' + JSON.stringify(LocalesChanges, null, 4)}, function(data){
                            hideLoader();
                            hasChanges = false;
                            document.location.reload();
                        });
                    }else{
                        hideLoader();
                        alert('ERROR, Cannot save!');
                    }
                });
            });
        }else{
            alert('Nothing to save');
        }
    }
    
    this.expand = function(){
        $('.section-form').addClass('opened');
    }

    this.collapse = function(){
        $('.section-form').removeClass('opened');
    }

    var checkSpecialTags = function(oldStr, newStr){
        // Allow clear the field
        if(newStr == '') return true;
        // Checks for <.*>, %.*%, _.*_
        if(lang !== 'en'){
            var regexp = new RegExp('%.*?%|_.*?_|<.*?>', 'ig');
            var oldMatches = oldStr.match(regexp);
            var newMatches = newStr.match(regexp);
            if(oldMatches || newMatches){
                var changed = false;
                if((!oldMatches && newMatches) || (oldMatches && !newMatches)){
                    changed = true;
                }else{
                    for(var i = 0; i< oldMatches.length; i++){
                        if(newMatches.indexOf(oldMatches[i]) < 0){
                            changed = true;
                            break;
                        }
                    }
                    for(var i = 0; i< newMatches.length; i++){
                        if(oldMatches.indexOf(newMatches[i]) < 0){
                            changed = true;
                            break;
                        }
                    }
                }
                if(changed){
                    alert('Special constructions were changed!\nDO NOT CHANGE ANYTHING INSIDE <...>, %...% or _..._ !!!');
                    return false;
                }
            }
        }
        return true;
    }

    var showLoader = function(){
        $('#loader').show();
        $('#loader-content').show();
    }

    var hideLoader = function(){
        $('#loader').hide();
        $('#loader-content').hide();
    }

    var addSection = function(sectionName){
        var sectionContainer = $('<DIV>');
        sectionContainer.attr('id', 'section-' + sectionName);
        sectionContainer.addClass('section-container');

        var sectionHeaderRow = $('<DIV>');
        sectionHeaderRow.addClass('row section-header');

        var sectionHeader = $('<DIV>');
        sectionHeader.addClass('col-xs-8');
        sectionHeader.append(sectionName.capitalize());

        var sectionChanges = $('<DIV>');
        sectionChanges.addClass('col-xs-4 text-right section-changes');
        sectionChanges.attr('id', 'section-changes-' + sectionName);

        sectionHeaderRow.append(sectionHeader);
        sectionHeaderRow.append(sectionChanges);
        
        var sectionFormRow = $('<DIV>');
        sectionFormRow.addClass('row');
        
        var sectionForm = $('<DIV>');
        sectionForm.addClass('col-xs-12 section-form');
        
        if('undefined' !== typeof(openedSections[sectionName]) && openedSections[sectionName]){
            sectionForm.addClass('opened');
        }

        sectionFormRow.append(sectionForm);

        sectionHeaderRow.click(function(sectionForm, sectionName){
            return function(){
                openedSections[sectionName] = ('undefined' !== typeof(openedSections[sectionName])) ? !openedSections[sectionName] : true;
                localStorage.setItem('openedSections', JSON.stringify(openedSections));
                sectionForm.toggleClass('opened');
            }
        }(sectionForm, sectionName));

        sectionContainer.append(sectionHeaderRow);
        sectionContainer.append(sectionFormRow);
        container.append(sectionContainer);
    }
    
    var addSectionForm = function(sectionName){
        var aSection = Locales[sectionName];
        var sectionForm = $('#section-' + sectionName + ' .section-form');
        for(var langVar in aSection){
            var localeRow = $('<DIV>');
            localeRow.addClass('row locale-row');
            localeRow.attr('id', 'locale-row-' + langVar);

            if('undefined' !== typeof(changedLocales[lang]) && 'undefined' !== typeof(changedLocales[lang][sectionName + ' - ' + langVar])){
                if(changedLocales[lang][sectionName + ' - ' + langVar]){
                    localeRow.addClass('changed');
                }
            }
            
            var localeHeader = $('<DIV>');
            localeHeader.addClass('col-xs-2 text-right locale-header');
            localeHeader.append(langVar + ':');

            var localeInput = $('<DIV>');
            localeInput.addClass('col-xs-6');
            
            var locale = getLocale(sectionName, langVar, lang);
            var localeEn = getLocale(sectionName, langVar, 'en');
            if(localeEn.indexOf("\n") < 0){
                var input = $('<INPUT>');
            }else{
                var rows = localeEn.split("\n").length + 1;
                var input = $('<TEXTAREA>');
                input.width('100%');
                input.attr('rows', rows);
            }

            var now = (new Date).getTime();
            var daysLockTime = daysLock * 24 * 3600 * 1000;
            
            if((lang != 'en') && ((now - LocalesChanges[sectionName][langVar]['en']) > daysLockTime)){
                input.prop('readonly', true);
            }

            input.attr('data-original', locale);
            if(!locale){
                input.attr('placeholder', localeEn);
            }
            input.addClass('form-control input-sm');
            input.attr('id', 'locale-var-' + sectionName + '-' + langVar);

            input.attr('data-section', sectionName);
            input.attr('data-locale', langVar);
            if((lang != 'en') && (0 === langVar.indexOf('sys_'))){
                input.prop('readonly', true);
            }

            input.change(function(_lang){
                return function(){
                    var _left = TIMER.timeLeft;
                    if(!_left){
                        if(confirm('Version is outdated. Refresh the page?')){
                            document.location.reload();
                        }
                        $(this).addClass('error');
                        return;                            
                    }

                    if((_left <= 10) && !window.timeAlerted){
                        alert('Please save within next 10 minutes, or changes will be lost!');
                        window.timeAlerted = true;
                    }

                    if('undefined' === typeof(changedLocales[lang])){
                        changedLocales[lang] = {};
                    }
                    $(this).removeClass('error');
                    if($(this).val() != $(this).attr('data-original')){
                        var enOrig = getLocale($(this).attr('data-section'), $(this).attr('data-locale'), 'en');
                        if(!checkSpecialTags(enOrig, $(this).val())){
                            $(this).addClass('error');
                            return;
                        }

                        if($(this).val().indexOf('%') >= 0){
                            var re = /%(.*?)%/g;
                            var matches = $(this).val().match(re);
                            if(matches && matches.length){
                                for(var i=0; i<matches.length; i++){
                                    var match = matches[i];
                                    var tst = /^[a-zA-Z0-9%_.]+$/g;
                                    if(!tst.test(match)){
                                        alert('Invalid symbols in %var% constructon detected!\nOnly a-z and digits allowed!');
                                        $(this).addClass('error');
                                        return;
                                    }
                                }
                            }
                        }
                        
                        var aOrigin = NewLocales[$(this).attr('data-section')][$(this).attr('data-locale')];
                        if('object' !== typeof(aOrigin)){
                            aOrigin = {
                                en: aOrigin
                            };
                        }
                        aOrigin[_lang] = $(this).val();
                        NewLocales[$(this).attr('data-section')][$(this).attr('data-locale')] = aOrigin;
                        $(this).parents('.locale-row').addClass('changed');
                        changedLocales[lang][$(this).attr('data-section') + ' - ' + $(this).attr('data-locale')] = true;
                    }else{
                        $(this).parents('.locale-row').removeClass('changed');
                        $(this).next('.locale-original').hide();
                        changedLocales[lang][$(this).attr('data-section') + ' - ' + $(this).attr('data-locale')] = false;
                    }
                    updateStats();
                    hasChanges = ($('.locale-row.changed').length > 0);
                }
            }(lang));
            
            input.val(locale);

            localeInput.append(input);

            if(false && lang !== 'en'){
                var tools = $('<DIV>');
                tools.addClass('locale-tools');

                var localeChangedText = $('<span>');                
                localeChangedText.addClass('locale-changed');
                localeChangedText.text('Show Original');
                localeChangedText.attr('title', 'Click to show original');

                localeChangedText.click(function(){
                    $(this).text(('Show Original' == $(this).text()) ? 'Hide Original' : 'Show Original');
                    $(this).parent().next().toggle();
                });
                tools.append(localeChangedText);

                var original = $('<PRE>');
                original.addClass('locale-original');
                original.text(locale);

                localeInput.append(tools);
                localeInput.append(original);
            }

            var localeEng = $('<PRE>');
            localeEng.addClass('col-xs-4 locale-en');
            localeEng.text(localeEn);

            var changed = $('<DIV>');
            changed.addClass('locale-change-date');
            var date = new Date(LocalesChanges[sectionName][langVar]['en']);
            var day = '0' + date.getDate().toString();
            var month = '0' + (date.getMonth() + 1).toString();
            day = day.substring(day.length - 2);
            month = month.substring(month.length - 2);
            var fullDate = date.getFullYear() + '-' + month + '-' + day;
            changed.text(fullDate);
            localeRow.attr('data-last-change', fullDate);

            localeRow.append(localeHeader);
            localeRow.append(localeInput);
            localeRow.append(localeEng);
            
            localeRow.append(changed);
            

            if(lang != 'en'){
                var changed = $('<DIV>');
                changed.addClass('locale-change-date-lang');
                var date = new Date(LocalesChanges[sectionName][langVar][lang]);
                if(date.getTime() > 1445695578820){
                var day = '0' + date.getDate().toString();
                var month = '0' + (date.getMonth() + 1).toString();
                day = day.substring(day.length - 2);
                month = month.substring(month.length - 2);
                var fullDate = date.getFullYear() + '-' + month + '-' + day;
                changed.text('Last changed: ' + fullDate);
                localeHeader.append(changed);
                }
            }

            sectionForm.append(localeRow);
        }
    }

    var _download = function(filename, text) {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }
}

$(document).ready(function(){
    oLE = new LocalesEditor();
    oLE.init('edit-area');
});


getLocale = function(type, key, lang){
    if(typeof(lang) === 'undefined'){
        lang = 'en';
    }
    var locale = Locales[type];
    var result = ((typeof(locale[key]) === 'string') && (lang === 'en')) ? locale[key] : '';
    if('object' === typeof(locale[key]) && 'undefined' !== typeof(locale[key][lang])){
        result = locale[key][lang];
    }
    return result;
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}