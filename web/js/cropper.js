(function ($) {
    $.fn.cropper = function (options, width, height) {
        var $widget = $(this).closest('.cropper-widget'),
            $progress = $widget.find('.progress'),
            cropper = {
                $widget: $widget,
                $progress: $progress,
                $progress_bar: $progress.find('.progress-bar'),
                $thumbnail: $widget.find('.thumbnail'),
                $photo_field: $widget.find('.photo-field'),
                $upload_new_photo: $widget.find('.upload-new-photo'),
                $new_photo_area: $widget.find('.new-photo-area'),
                $cropper_label: $widget.find('.cropper-label'),
                $cropper_add: $widget.find('.add-photo'),
                $cropper_delete: $widget.find('.close'),
                $cropper_crop: $widget.find('.crop-photo'),
                $cropper_buttons: $widget.find('.cropper-buttons'),
                $width_input: $widget.find('.width-input'),
                $height_input: $widget.find('.height-input'),
                uploader: null,
                reader: null,
                selectedFile: null,
                init: function () {
                    cropper.reader = new FileReader();
                    cropper.reader.onload = function (e) {
                        cropper.clearOldImg();
                        
                        /* added code */
                        cropper.$cropper_add.addClass('hidden');
                        cropper.$cropper_crop.removeClass('hidden');
                        /* end added code */

                        cropper.$new_photo_area.append('<img src="' + e.target.result + '">');
                        cropper.$img = cropper.$new_photo_area.find('img');

                        var image = new Image();
                        image.src = e.target.result;

                        image.onload = function() {
                            var x1 = (this.width - width) / 2;
                            var y1 = (this.height - height) / 2;
                            var x2 = x1 + width;
                            var y2 = y1 + height;
                            var aspectRatio = (options.aspectRatio !== null && options.aspectRatio !== 'undefined') ? options.aspectRatio : width / height;
                            
                            cropper.$img.Jcrop({
                                aspectRatio: aspectRatio,
                                setSelect: [x1, y1, x2, y2],
                                boxWidth: cropper.$new_photo_area.width(),
                                boxHeight: cropper.$new_photo_area.height(),
                                keySupport: false
                            });
                        };

                        cropper.setProgress(0);
                    };

                    var settings = $.extend({
                        button: [
                            cropper.$cropper_add,
                            cropper.$upload_new_photo,
                            cropper.$cropper_label
                        ],
                        //dropzone: cropper.$cropper_label,
                        responseType: 'json',
                        noParams: true,
                        multipart: true,
                        onChange: function () {
                            if (cropper.selectedFile) {
                                cropper.selectedFile = null;
                                cropper.uploader._queue = [];
                            }
                            return true;
                        },
                        onSubmit: function () {
                            if (cropper.selectedFile) {
                                return true;
                            }
                            cropper.selectedFile = cropper.uploader._queue[0];

                            cropper.setProgress(55);
                            cropper.showError('');
                            cropper.reader.readAsDataURL(this._queue[0].file);
                            cropper.$cropper_delete.removeClass('hidden');
                            return false;
                        },
                        onComplete: function (filename, response) {
                            cropper.$progress.addClass('hidden');
                            if (response['error']) {
                                cropper.showError(response['error']);
                                return;
                            }
                            cropper.showError('');
 
                            $('.new-photo-area img').attr({'src': response['filelink']});

                            cropper.$photo_field.val(response['filelink']);
                            if ((typeof options.onCompleteJcrop !== "undefined") && (typeof options.onCompleteJcrop === "string")) {
                                eval('var onCompleteJcrop = ' + options.onCompleteJcrop);
                                onCompleteJcrop(filename, response);
                            }
                        },
                        onSizeError: function () {
                            cropper.showError(options['size_error_text']);
                            cropper.cropper.setProgress(0);
                        },
                        onExtError: function () {
                            cropper.showError(options['ext_error_text']);
                            cropper.setProgress(0);
                        }
                    }, options);

                    cropper.uploader = new ss.SimpleUpload(settings);

                    cropper.$widget
                        .on('click', '.close', function () {
                            cropper.clearOldImg();
                        })
                        .on('click', '.crop-photo', function () {
                            var data = cropper.$img.data('Jcrop').tellSelect();
                            data[yii.getCsrfParam()] = yii.getCsrfToken();
                            data['width'] = cropper.$width_input.val();
                            data['height'] = cropper.$height_input.val();

                            if (cropper.uploader._queue.length) {
                                cropper.selectedFile = cropper.uploader._queue[0];
                            } else {
                                cropper.uploader._queue[0] = cropper.selectedFile;
                            }
                            cropper.uploader.setData(data);

                            cropper.setProgress(1);
                            cropper.uploader.setProgressBar(cropper.$progress_bar);
                            cropper.$cropper_delete.removeClass('hidden');

                            cropper.readyForSubmit = true;
                            cropper.uploader.submit();

                        });
                },
                showError: function (error) {
                    if (error == '') {
                        cropper.$widget.parents('.form-group').removeClass('has-error').find('.help-block').text('');
                    } else {
                        cropper.$widget.parents('.form-group').addClass('has-error').find('.help-block').text(error);
                    }
                },
                setProgress: function (value) {
                    if (value) {
                        cropper.$cropper_buttons.find('button').removeClass('hidden');
                        cropper.$cropper_add.addClass('hidden');
                        cropper.$cropper_label.addClass('hidden');
                        cropper.$progress.removeClass('hidden');
                        cropper.$progress_bar.css({'width': value + '%'});
                    } else {
                        cropper.$progress.addClass('hidden');
                        cropper.$progress_bar.css({'width': 0});
                    }
                },
                deletePhoto: function () {
                    cropper.$photo_field.val('');
                },
                clearOldImg: function () {
                    if (cropper.$img) {
                        cropper.$cropper_add.removeClass('hidden');
                        cropper.$cropper_crop.addClass('hidden');
                        cropper.$cropper_delete.addClass('hidden');
                        cropper.$cropper_label.removeClass('hidden');
                        cropper.$img.data('Jcrop').destroy();
                        cropper.$img.remove();
                        cropper.$img = null;
                    }
                }
            };

        cropper.init();
    };
})(jQuery);
