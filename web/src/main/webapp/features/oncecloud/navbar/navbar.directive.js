(function( $ ) {
    'use strict';
    /**
     * (en)navbarDirective
     * @ko navbarDirective
     * @group Directive
     * @name navbarDirective
     * @class
     */
    pinpointApp.constant( "navbarDirectiveConfigX", {
        periodTypePrefix: ".navbar.periodType",
        periodType: {
            "RANGE": "range",
            "LAST": "last",
            "REALTIME": "realtime"
        }
    });

    pinpointApp.directive('navbarxDirective', [ "navbarDirectiveConfigX", "$route", "$rootScope", "$http","$document", "$timeout", "$window",  "webStorage", "helpContentService", "UrlVoService", "AnalyticsService", "PreferenceService", "TooltipService", "CommonAjaxService", "CommonUtilService",
        function (cfg, $route, $rootScope, $http, $document, $timeout, $window, webStorage, helpContentService, UrlVoService, analyticsService, preferenceService, tooltipService, commonAjaxService, CommonUtilService ) {
            return {
                restrict: 'EA',
                replace: true,
                templateUrl: 'features/oncecloud/navbar/navbar.html?v=' + G_BUILD_TIME,
                link: function (scope, element) {
                    // define private variables
                    var $application, $fromPicker, $toPicker, oNavbarVoService, $fromToCalendarPopup, bIsClickDepthInnerArea = false, bIsClickDepthInnerBtn = false, prevCallee, prevCaller;

                    // define private variables of methods
                    var initialize, initializeDateTimePicker, initializeApplication, setDateTime, getQueryEndTimeFromServer,
                        broadcast, getApplicationList, getQueryStartTime, getQueryEndTime, parseApplicationList, emitAsChanged,
                        initializeWithStaticApplication, getPeriodType, setPeriodTypeAsCurrent, getDate, startUpdate,
                        resetTimeLeft, getMilliSecondByReadablePeriod, movePeriod, selectPeriod,
                        toggleCalendarPopup, getPeriodForCalendar;

                    var applicationResource;

                    scope.bIsInspector = false;
                    scope.periodDelay = false;
                    scope.aReadablePeriodList = preferenceService.getPeriodTime();
                    scope.autoUpdate = false;
                    scope.timeLeft = 10;
                    scope.timeCountDown = 10;
                    scope.timeList = preferenceService.getUpdateTimes();
                    scope.callee = prevCallee = preferenceService.getCalleeByApp( scope.application );
                    scope.caller = prevCaller = preferenceService.getCallerByApp( scope.application );
                    scope.rangeList = preferenceService.getDepthList();
                    scope.applications = [
                        {
                            text: 'Select an application.',
                            value: ''
                        }
                    ];
                    element.bind('selectstart', function (e) {
                        return false;
                    });
                    tooltipService.init( "navbar" );

                    function initDepth() {
                        $("#navbar_depth div").on("show.bs.dropdown", function() {
                        }).on("hide.bs.dropdown", function( event ) {
                            if ( bIsClickDepthInnerArea === true ) {
                                event.preventDefault();
                            } else {
                                if ( bIsClickDepthInnerBtn === false ) {
                                    scope.$apply(function () {
                                        scope.cancelDepth(false);
                                    });
                                }
                            }
                            bIsClickDepthInnerArea = false;
                            bIsClickDepthInnerBtn = false;
                        });
                        $("#navbar_depth .dropdown-menu").on("click", function() {
                            bIsClickDepthInnerArea = true;
                        });
                    }
                    initDepth();

                    /**
                     * initialize
                     * @param navbarVo
                     */
                    initialize = function (navbarVoService, bIsInspector) {
                        oNavbarVoService = navbarVoService;

                        scope.bIsInspector = bIsInspector === true;
                        scope.periodType = getPeriodType();
                        $application = element.find('.application');
                        $application.select2();

                        scope.applications = [
                            {
                                text: 'Loading...',
                                value: ''
                            }
                        ];
                        scope.application = oNavbarVoService.getApplication() || "";
                        // if ( scope.application !== "" ) {
                        scope.callee = prevCallee = preferenceService.getCalleeByApp( scope.application );
                        scope.caller = prevCaller = preferenceService.getCallerByApp( scope.application );
                        // }
                        scope.disableApplication = true;
                        scope.readablePeriod = oNavbarVoService.getReadablePeriod() || preferenceService.getPeriod();
                        scope.periodCalendar = oNavbarVoService.getReadablePeriod() || preferenceService.getPeriod();
                        scope.queryEndTime = oNavbarVoService.getQueryEndTime() || "";

                        initializeApplication();
                        initializeDateTimePicker();
                        getApplicationList();
                    };

                    /**
                     * initialize with static application
                     * @param navbarVo
                     */
                    initializeWithStaticApplication = function (navbarVoService) {
                        oNavbarVoService = navbarVoService;

                        scope.periodType = getPeriodType();
                        $application = element.find('.application');
                        scope.application = oNavbarVoService.getApplication() || '';
                        scope.applicationName = oNavbarVoService.getApplicationName() || '';
                        scope.readablePeriod = oNavbarVoService.getReadablePeriod() || preferenceService.getPeriod();
                        scope.periodCalendar = oNavbarVoService.getReadablePeriod() || preferenceService.getPeriod();
                        scope.queryEndTime = oNavbarVoService.getQueryEndTime() || '';

                        $("#ui-datepicker-div").remove();
                        //if ( bInitCalendar === false ) {
                        //	initializeDateTimePicker();
                        //	bInitCalendar = true;
                        //}
                    };

                    /**
                     * initialize date time picker
                     */
                    initializeDateTimePicker = function () {
                        $fromToCalendarPopup = $("#ui-datepicker-div");
                        $fromToCalendarPopup.find(".guide").html(helpContentService.navbar.searchPeriod.guide.replace(/\{\{day\}\}/, preferenceService.getMaxPeriod() ) );
                        $fromToCalendarPopup.find("button.ui-datepicker-close").on("click", function() {
                            $fromToCalendarPopup.hide();
                        });

                        $fromPicker = element.find('#from-picker');
                        $fromPicker.datetimepicker({
                            altField: "#from-picker-alt",
                            altFieldTimeOnly: false,
                            dateFormat: "yy-mm-dd",
                            timeFormat: "HH:mm z",
                            controlType: "select",
                            showButtonPanel: false,
                            timezone: moment().utcOffset(),
                            showTimezone: false,
                            onSelect: function () {
                                var momentFrom = moment(getDate($fromPicker));
                                var momentTo = moment(getDate($toPicker));
                                if ( momentTo.isAfter( moment(getDate($fromPicker)).add(preferenceService.getMaxPeriod(), "days") ) || momentFrom.isAfter(momentTo) ) {
                                    var aPeriodTime = getPeriodForCalendar();
                                    setDateTime($toPicker, momentFrom.add( aPeriodTime[0], aPeriodTime[1] ).format());
                                }
                            },
                            onClose: function (currentTime, oTime) {
                                if ($toPicker.val() !== '') {
                                    if ($fromPicker.datetimepicker('getDate') > $toPicker.datetimepicker('getDate')) {
                                        $toPicker.datetimepicker('setDate', $fromPicker.datetimepicker('getDate'));
                                    }
                                } else {
                                    $toPicker.val(currentTime);
                                }
                            }
                        });
                        setDateTime($fromPicker, oNavbarVoService.getQueryStartTime() || moment().subtract(5, "minute").valueOf());

                        $toPicker = element.find('#to-picker');
                        $toPicker.datetimepicker({
                            altField: "#to-picker-alt",
                            altFieldTimeOnly: false,
                            dateFormat: "yy-mm-dd",
                            timeFormat: "HH:mm z",
                            controlType: "select",
                            showButtonPanel: false,
                            timezone: moment().utcOffset(),
                            showTimezone: false,
                            onSelect: function () {
                                var momentFrom = moment(getDate($fromPicker));
                                var momentTo = moment(getDate($toPicker));
                                if ( momentFrom.isBefore(moment(getDate($toPicker)).subtract(preferenceService.getMaxPeriod(), "days")) || momentFrom.isAfter(momentTo) ) {
                                    var aPeriodTime = getPeriodForCalendar();
                                    setDateTime($fromPicker, momentTo.subtract(aPeriodTime[0], aPeriodTime[1]).format());
                                }
                            },
                            onClose: function (currentTime, oTime) {
                                if ($fromPicker.val() !== '') {
                                    if ($fromPicker.datetimepicker('getDate') > $toPicker.datetimepicker('getDate')) {
                                        $fromPicker.datetimepicker('setDate', $toPicker.datetimepicker('getDate'));
                                    }
                                } else {
                                    $fromPicker.val(currentTime);
                                }
                            }
                        });
                        setDateTime($toPicker, oNavbarVoService.getQueryEndTime());

                        $("#from-picker-alt").on("click", function() {
                            toggleCalendarPopup();
                        });
                        $("#to-picker-alt").on("click", function() {
                            toggleCalendarPopup();
                        });
                        $(document).mousedown(function(event) {
                            if ( $fromToCalendarPopup.is(":visible") === false ) return;
                            if ( $(event.target).parents("div#ui-datepicker-div").length === 0 ) {
                                $fromToCalendarPopup.hide();
                            }
                        });
                    };
                    getPeriodForCalendar = function() {
                        var a = [];
                        var s = scope.periodCalendar.substring( scope.periodCalendar.length - 1 );
                        a[0] = parseInt( scope.periodCalendar );
                        a[1] = s == "d" ? "days" : s == "h" ? "hours" : "minutes";
                        return a;
                    };

                    toggleCalendarPopup = function() {
                        if ( $fromToCalendarPopup.is(":visible") ) {
                            $fromToCalendarPopup.hide();
                        } else {
                            $fromToCalendarPopup.css("left", $("#navbar_period").offset().left );
                            $fromToCalendarPopup.show();
                        }
                    };

                    getDate = function ($picker) {
                        return $picker.datetimepicker('getDate');
                    };

                    /**
                     * get period type
                     * @returns {*}
                     */
                    getPeriodType = function () {
                        if ( oNavbarVoService.isRealtime() ) {
                            return cfg.periodType.REALTIME;
                        }
                        var periodType = cfg.periodType.LAST;
                        if ($window.name && webStorage.get($window.name + cfg.periodTypePrefix)) {
                            periodType = webStorage.get($window.name + cfg.periodTypePrefix);
                        } else {
                            periodType = oNavbarVoService.getApplication() ? cfg.periodType.RANGE : cfg.periodType.LAST;
                        }

                        if (oNavbarVoService.getReadablePeriod() && _.indexOf(scope.aReadablePeriodList, oNavbarVoService.getReadablePeriod()) < 0) {
                            periodType = cfg.periodType.RANGE;
                        }
                        return periodType;
                    };

                    setPeriodTypeAsCurrent = function () {
                        $window.name = $window.name || 'window.' + _.random(100000, 999999);
                        webStorage.add($window.name + cfg.periodTypePrefix, scope.periodType);
                    };

                    /**
                     * set DateTime
                     */
                    setDateTime = function ($picker, time) {
                        $picker.datetimepicker('setDate', time ? new Date(time) : new Date());
                    };

                    /**
                     * broadcast
                     */
                    broadcast = function () {
                        if (!scope.application) {
                            return;
                        }
                        oNavbarVoService.setApplication(scope.application);
                        UrlVoService.setApplication(scope.application);

                        scope.callee = prevCallee = preferenceService.getCalleeByApp(scope.application);
                        scope.caller = prevCaller = preferenceService.getCallerByApp(scope.application);

                        oNavbarVoService.setCalleeRange( scope.callee );
                        oNavbarVoService.setCallerRange( scope.caller );
                        UrlVoService.setCallee( scope.callee );
                        UrlVoService.setCaller( scope.caller );

                        if (scope.periodType === cfg.periodType.LAST && scope.readablePeriod) {
                            oNavbarVoService.setPeriodType( cfg.periodType.LAST );
                            UrlVoService.setPeriodType( cfg.periodType.LAST );
                            getQueryEndTimeFromServer(function (currentServerTime) {
                                // currentServerTime -= 3000;
                                oNavbarVoService.setReadablePeriod(scope.readablePeriod);
                                oNavbarVoService.setQueryEndDateTime( CommonUtilService.formatDate( currentServerTime ) );
                                oNavbarVoService.autoCalculateByQueryEndDateTimeAndReadablePeriod();
                                UrlVoService.setReadablePeriod(scope.readablePeriod);
                                UrlVoService.setQueryEndDateTime( CommonUtilService.formatDate( currentServerTime ) );
                                UrlVoService.autoCalculateByQueryEndDateTimeAndReadablePeriod();
                                emitAsChanged();
                                setDateTime($fromPicker, oNavbarVoService.getQueryStartTime());
                                setDateTime($toPicker, oNavbarVoService.getQueryEndTime());
                            });
                        } else if ( scope.periodType === cfg.periodType.REALTIME ) {
                            oNavbarVoService.setPeriodType( cfg.periodType.REALTIME );
                            UrlVoService.setPeriodType( cfg.periodType.REALTIME );
                            getQueryEndTimeFromServer(function (currentServerTime) {
                                oNavbarVoService.setReadablePeriod( preferenceService.getRealtimeScatterXRangeStr() );
                                oNavbarVoService.setQueryEndDateTime( CommonUtilService.formatDate( currentServerTime ) );
                                oNavbarVoService.autoCalculateByQueryEndDateTimeAndReadablePeriod();
                                UrlVoService.setQueryEndDateTime( CommonUtilService.formatDate( currentServerTime ) );
                                UrlVoService.autoCalculateByQueryEndDateTimeAndReadablePeriod();
                                emitAsChanged();
                                setDateTime($fromPicker, oNavbarVoService.getQueryStartTime());
                                setDateTime($toPicker, oNavbarVoService.getQueryEndTime());
                            });
                        } else if (getQueryStartTime() && getQueryEndTime()) {
                            oNavbarVoService.setPeriodType( cfg.periodType.RANGE );
                            oNavbarVoService.setQueryStartTime(getQueryStartTime());
                            oNavbarVoService.setQueryEndTime(getQueryEndTime());
                            oNavbarVoService.autoCalcultateByQueryStartTimeAndQueryEndTime();
                            UrlVoService.setPeriodType( cfg.periodType.RANGE );
                            UrlVoService.setQueryStartTime(getQueryStartTime());
                            UrlVoService.setQueryEndTime(getQueryEndTime());
                            UrlVoService.autoCalcultateByQueryStartTimeAndQueryEndTime();
                            emitAsChanged();
                        }
                    };

                    /**
                     * emit as changed
                     */
                    emitAsChanged = function () {
                        setPeriodTypeAsCurrent();
                        scope.$emit( "navbarDirective.changed", oNavbarVoService );
                    };

                    /**
                     * get query end time from server
                     * @param cb
                     */
                    getQueryEndTimeFromServer = function (cb) {
                        commonAjaxService.getServerTime( function( serverTime ) {
                            cb( serverTime );
                        });
                    };

                    /**
                     * get Application List
                     */
                    getApplicationList = function () {
                        commonAjaxService.getApplicationList( function( data ) {
                            if (angular.isArray(data) === false || data.length === 0) {
                                scope.applications[0].text = 'Application not found.';
                            } else {
                                applicationResource = data;
                                parseApplicationList(applicationResource, function () {
                                    scope.disableApplication = false;
                                    $timeout(function () { // it should be apply after pushing data, so
                                        // it should work like nextTick
                                        //                                    initializeApplication();
                                        if (oNavbarVoService.getApplication()) {
                                            $application.val(oNavbarVoService.getApplication()).trigger("change");
                                            scope.application = oNavbarVoService.getApplication();
                                        } else {
                                            $application.select2("open");
                                        }
                                    });
                                });
                            }
                            scope.hideFakeApplication = true;
                        }, function() {
                            scope.applications[0].text = 'Application error.';
                            scope.hideFakeApplication = true;
                        });
                    };

                    /**
                     * get query start time
                     * @returns {*}
                     */
                    getQueryStartTime = function () {
                        return $fromPicker.datetimepicker('getDate').getTime();
                    };

                    /**
                     * get query end time
                     * @returns {*}
                     */
                    getQueryEndTime = function () {
                        return $toPicker.datetimepicker('getDate').getTime();
                    };

                    /**
                     * parse Application List
                     */
                    parseApplicationList = function (data, cb) {
                        var aSavedFavoriteList = preferenceService.getFavoriteList();
                        scope.favoriteCount = aSavedFavoriteList.length;
                        scope.applications = [{
                            text: '',
                            value: ''
                        }];
                        var aFavoriteList = [];
                        var aGeneralList = [];
                        angular.forEach(data, function (value, key) {
                            var fullName = value.applicationName + "@" + value.serviceType;
                            if ( aSavedFavoriteList.indexOf( fullName ) === -1 ) {
                                aGeneralList.push({
                                    text: fullName,
                                    value: value.applicationName + "@" + value.code
                                });
                            } else {
                                aFavoriteList.push({
                                    text: fullName,
                                    value: value.applicationName + "@" + value.code
                                });
                            }
                        });
                        scope.applications = aFavoriteList.concat( aGeneralList );
                        if (angular.isFunction(cb)) {
                            cb.apply(scope);
                        }
                    };

                    /**
                     * initialize application
                     */
                    initializeApplication = function () {
                        /**
                         * format option text
                         * @param state
                         * @returns {*}
                         */
                        function formatOptionText(state) {
                            if (!state.id) {
                                return state.text;
                            }
                            var chunk = state.id.split("@");
                            if (chunk.length > 1) {
                                var img = document.createElement("img");
                                img.src = "images/icons/" + chunk[1] + ".png";
                                img.style.height = "25px";
                                img.style.paddingRight= "3px";
                                return img.outerHTML + "<span>" + chunk[0] + "</span>";
                            } else {
                                return state.text;
                            }
                        }

                        $application.select2({
                            placeholder: "Select an application",
                            searchInputPlaceholder: "Input your application name",
                            allowClear: false,
                            templateResult: formatOptionText,
                            templateSelection: formatOptionText,
                            escapeMarkup: function (m) {
                                return m;
                            }
                        });
                        $application.on("select2:select", function (e) {
                            analyticsService.send( analyticsService.CONST.MAIN, analyticsService.CONST.CLK_APPLICATION );
                            scope.application = $application.val();
                            scope.$digest();
                            broadcast();
                            // ref1 : http://jimhoskins.com/2012/12/17/angularjs-and-apply.html
                            // ref2 : http://jsfiddle.net/CDvGy/2/
                        });
                    };
                    getMilliSecondByReadablePeriod = function( period ) {
                        var time = parseInt( period );
                        switch( period.substring( period.length - 1) ) {
                            case "m":
                                time *= 60 * 1000;
                                break;
                            case "h":
                                time *= 60 * 60 * 1000;
                                break;
                            case "d":
                                time *= 60 * 60 * 24 * 1000;
                                break;
                        }
                        return time;
                    };
                    movePeriod = function( movedTime ) {
                        if ( scope.periodType === cfg.periodType.LAST ) {
                            oNavbarVoService.setQueryEndDateTime(moment(oNavbarVoService.getQueryEndTime() + movedTime).format('YYYY-MM-DD-HH-mm-ss'));
                            oNavbarVoService.autoCalculateByQueryEndDateTimeAndReadablePeriod();
                            emitAsChanged();
                            setDateTime($fromPicker, oNavbarVoService.getQueryStartTime());
                            setDateTime($toPicker, oNavbarVoService.getQueryEndTime());
                        } else {
                            setDateTime($fromPicker, oNavbarVoService.getQueryStartTime() + movedTime);
                            setDateTime($toPicker, oNavbarVoService.getQueryEndTime() + movedTime );
                            oNavbarVoService.setQueryStartTime(getQueryStartTime());
                            oNavbarVoService.setQueryEndTime(getQueryEndTime());
                            oNavbarVoService.autoCalcultateByQueryStartTimeAndQueryEndTime();
                            emitAsChanged();
                        }
                    };
                    selectPeriod = function( readablePeriod ) {
                        analyticsService.send(analyticsService.CONST.MAIN, analyticsService.CONST.CLK_TIME, readablePeriod);
                        scope.periodDelay = true;
                        scope.readablePeriod = readablePeriod;
                        scope.autoUpdate = false;
                        broadcast();
                        $timeout(function () {
                            scope.periodDelay = false;
                            if (!scope.$$phase) {
                                scope.$digest();
                            }
                        }, 1000);
                    };


                    /**
                     * search
                     */
                    scope.search = function () {
                        broadcast();
                    };

                    /**
                     * set period
                     * @param readablePeriod
                     */
                    scope.setPeriod = function (readablePeriod) {
                        scope.periodType = cfg.periodType.LAST;
                        selectPeriod(readablePeriod);
                    };
                    scope.getPreviousClass = function() {
                        return "";
                    };
                    scope.getNextClass = function() {
                        return "";
                    };

                    scope.getPeriodClassInCalendar = function (period) {
                        return ( scope.periodCalendar === period ? "btn-success" : "" );
                    };
                    /**
                     * get period class
                     * @param readablePeriod
                     * @returns {string}
                     */
                    scope.getPeriodClass = function (readablePeriod) {
                        var periodClass = "";
                        if ( scope.periodType !== cfg.periodType.LAST ) {
                            return periodClass;
                        }
                        if (scope.readablePeriod === readablePeriod) {
                            periodClass += "btn-info";
                        }

                        if (scope.periodDelay) {
                            periodClass += " wait";
                        }

                        return periodClass;
                    };

                    /**
                     * show upddate
                     * @returns {boolean}
                     */
                    scope.showUpdate = function () {
                        if( scope.bIsInspector ) {
                            return false;
                        } else {
                            return scope.periodType === cfg.periodType.LAST && (_.indexOf(['5m', '20m', '1h', '3h'], scope.readablePeriod) >= 0) && scope.application ? true : false;
                        }
                    };
                    scope.changeUpdateSetting = function() {
                        analyticsService.send(analyticsService.CONST.MAIN, scope.autoUpdate ? analyticsService.CONST.TG_UPDATE_OFF : analyticsService.CONST.TG_UPDATE_ON );
                    };

                    /**
                     * start update
                     */
                    startUpdate = function () {
                        if (scope.autoUpdate) {
                            scope.timeLeft -= 1;
                            if (scope.timeLeft === 0) {
                                scope.update();
                                scope.timeLeft = scope.timeCountDown;
                            } else {
                                $timeout(startUpdate, 1000);
                            }
                        }
                    };

                    /**
                     * reset tiem left
                     */
                    resetTimeLeft = function () {
                        scope.timeLeft = scope.timeCountDown;
                    };
                    scope.setPeriodForCalendar = function(period) {
                        scope.periodCalendar = period;
                    };

                    /**
                     * set auto update time
                     * @param time
                     */
                    scope.setAutoUpdateTime = function (time) {
                        analyticsService.send(analyticsService.CONST.MAIN, analyticsService.CONST.CLK_UPDATE_TIME, time + "s");
                        scope.timeCountDown = time;
                        scope.timeLeft = time;
                    };
                    scope.setCallee = function(callee) {
                        scope.callee = callee;
                    };
                    scope.setCaller = function(caller) {
                        scope.caller = caller;
                    };
                    scope.setDepth = function() {
                        bIsClickDepthInnerArea = false;
                        bIsClickDepthInnerBtn = true;
                        $("#navbar_depth .dropdown-menu").trigger("click.bs.dropdown");
                        if ( prevCallee !== scope.callee || prevCaller !== scope.caller ) {
                            analyticsService.send(analyticsService.CONST.MAIN, analyticsService.CONST.CLK_CALLEE_RANGE, scope.callee);
                            analyticsService.send(analyticsService.CONST.MAIN, analyticsService.CONST.CLK_CALLER_RANGE, scope.caller);
                            prevCallee = scope.callee;
                            prevCaller = scope.caller;
                            preferenceService.setDepthByApp( scope.application + "+callee", scope.callee );
                            preferenceService.setDepthByApp( scope.application + "+caller", scope.caller );

                            window.location.reload(true);
                            // broadcast();
                        }
                    };
                    scope.cancelDepth = function( bHide ) {
                        scope.callee = prevCallee;
                        scope.caller = prevCaller;
                        if ( bHide ) {
                            bIsClickDepthInnerArea = false;
                            bIsClickDepthInnerBtn = true;
                            $("#navbar_depth .dropdown-menu").trigger("click.bs.dropdown");
                        }
                    };


                    /**
                     * update
                     */
                    scope.update = function () {
                        var oldAutoUpdate = scope.autoUpdate;
                        scope.autoUpdate = false;
                        scope.periodDelay = true;
                        broadcast();
                        $timeout(function () {
                            scope.periodDelay = false;
                            resetTimeLeft();
                            scope.autoUpdate = oldAutoUpdate;
                            if (!scope.$$phase) {
                                scope.$digest();
                            }
                        }, 1000);
                    };

                    /**
                     * toggle period
                     * @param type
                     */
                    scope.togglePeriod = function (type) {
                        analyticsService.send(analyticsService.CONST.MAIN, analyticsService.CONST.TG_DATE, type);
                        scope.periodType = type;
                        scope.autoUpdate = false;
                    };
                    scope.setRealtime = function () {
                        if ( scope.periodType === cfg.periodType.REALTIME ) return;
                        analyticsService.send( analyticsService.CONST.MAIN, analyticsService.CONST.CLK_START_REALTIME );
                        scope.periodType = cfg.periodType.REALTIME;
                        scope.autoUpdate = false;
                        broadcast();
                    };
                    scope.isRealtime = function() {
                        return ( typeof oNavbarVoService === "undefined" || oNavbarVoService === null ? false : oNavbarVoService.isRealtime() );
                    };

                    scope.showConfig = function() {
                        $rootScope.$broadcast("configuration.open");
                    };

                    /**
                     * watch auto update
                     */
                    scope.$watch('autoUpdate', function (newVal, oldVal) {
                        if (newVal) {
                            $timeout(startUpdate, 1000);
                        } else {
                            resetTimeLeft();
                        }
                    });

                    /**
                     * scope event on navbarDirective.initialize
                     */
                    scope.$on('navbarDirective.initialize', function (event, navbarVo, bIsInspector) {
                        initialize(navbarVo, bIsInspector);
                    });
                    scope.$on('navbarDirective.initialize.andReload', function (event, navbarVo) {
                        initialize(navbarVo);
                        scope.periodType = cfg.periodType.LAST;
                        selectPeriod(preferenceService.getPeriod());
                    });
                    scope.$on('navbarDirective.initialize.realtime.andReload', function (event, navbarVo) {
                        initialize(navbarVo);
                        scope.periodType = cfg.periodType.REALTIME;
                        selectPeriod(preferenceService.getPeriod());
                    });

                    /**
                     * scope event on navbarDirective.initializeWithStaticApplication
                     */
                    scope.$on('navbarDirective.initializeWithStaticApplication', function (event, navbarVo) {
                        initializeWithStaticApplication(navbarVo);
                    });

                    scope.$on('navbarDirective.moveToPast', function (event) {
                        if ( scope.periodType === cfg.periodType.LAST ) {
                            movePeriod(-getMilliSecondByReadablePeriod( scope.readablePeriod ));
                        } else {
                            movePeriod(-(oNavbarVoService.getQueryEndTime() - oNavbarVoService.getQueryStartTime()));
                        }
                    });

                    scope.$on('navbarDirective.moveToFuture', function (event) {
                        if ( scope.periodType === cfg.periodType.LAST ) {
                            movePeriod(getMilliSecondByReadablePeriod( scope.readablePeriod ));
                        } else {
                            movePeriod(oNavbarVoService.getQueryEndTime() - oNavbarVoService.getQueryStartTime());
                        }
                    });
                    scope.$on('navbarDirective.changedFavorite', function (event) {
                        parseApplicationList(applicationResource, function () {
                            scope.disableApplication = false;
                            $timeout(function () {
                                if (oNavbarVoService.getApplication()) {
                                    $application.val(oNavbarVoService.getApplication()).trigger("change");
                                    scope.application = oNavbarVoService.getApplication();
                                }
                            });
                        });
                        $application.off("select2.select").select2("destroy");
                        initializeApplication();
                        $application.val(oNavbarVoService.getApplication()).trigger("change");
                    });
                }
            };
        }
    ]);
})( jQuery );
