<?php

namespace budyaga\cropper\actions;

use yii\base\Action;
use yii\base\DynamicModel;
use yii\base\InvalidConfigException;
use yii\web\BadRequestHttpException;
use yii\web\Response;
use yii\web\UploadedFile;
use budyaga\cropper\Widget;
use yii\imagine\Image;
use Imagine\Image\Box;
use Aws\S3\S3Client;
use Yii;

class UploadAction extends Action
{
    public $path;
    public $url;
    public $uploadParam = 'file';
    public $maxSize = 16777216;
    public $extensions = 'jpeg, jpg, png, gif';
    public $width = 200;
    public $height = 200;

    public $s3client;

    /**
     * @inheritdoc
     */
    public function init()
    {
        Widget::registerTranslations();
        if ($this->url === null) {
            throw new InvalidConfigException(Yii::t('cropper', 'MISSING_ATTRIBUTE', ['attribute' => 'url']));
        } else {
            $this->url = rtrim($this->url, '/') . '/';
        }
        if ($this->path === null) {
            throw new InvalidConfigException(Yii::t('cropper', 'MISSING_ATTRIBUTE', ['attribute' => 'path']));
        } else {
            $this->path = rtrim(Yii::getAlias($this->path), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
        }

        putenv("AWS_ACCESS_KEY_ID=".Yii::$app->params['aws_key']);
        putenv("AWS_SECRET_ACCESS_KEY=".Yii::$app->params['aws_secret_key']);

        // Instantiate the S3 client with your AWS credentials
        $this->s3client = S3Client::factory([
            'version' => 'latest',
            'region'  => 'us-east-1'
        ]);
    }

    /**
     * @inheritdoc
     */
    public function run()
    {
        if (Yii::$app->request->isPost) {
            $file = UploadedFile::getInstanceByName($this->uploadParam);
            $model = new DynamicModel(compact($this->uploadParam));
            $model->addRule($this->uploadParam, 'image', [
                'maxSize' => $this->maxSize,
                'tooBig' => Yii::t('cropper', 'TOO_BIG_ERROR', ['size' => $this->maxSize / (1024 * 1024)]),
                'extensions' => explode(', ', $this->extensions),
                'wrongExtension' => Yii::t('cropper', 'EXTENSION_ERROR', ['formats' => $this->extensions])
            ])->validate();

            if ($model->hasErrors()) {
                $result = [
                    'error' => $model->getFirstError($this->uploadParam)
                ];
            } else {
                $model->{$this->uploadParam}->name = uniqid() . '.' . $model->{$this->uploadParam}->extension;
                $request = Yii::$app->request;

                $width = $request->post('width', $this->width);
                $height = $request->post('height', $this->height);

                $image = Image::crop(
                    $file->tempName . $request->post('filename'),
                    intval($request->post('w')),
                    intval($request->post('h')),
                    [$request->post('x'), $request->post('y')]
                )->resize(
                    new Box(intval($request->post('w')), intval($request->post('h')))
                );
                
                if (!file_exists($this->path) || !is_dir($this->path)) {
                    $result = [
                        'error' => Yii::t('cropper', 'ERROR_NO_SAVE_DIR')]
                    ;
                } else {

                    if ($image->save($this->path . $model->{$this->uploadParam}->name, ['jpeg_quality' => 100, 'png_compression_level' => 1])) {

                        try {
                            $result = $this->s3client->putObject(array(
                                'Bucket'     => Yii::$app->params['s3bucket'],
                                'Key'        => 'crop/'.$model->{$this->uploadParam}->name,
                                'SourceFile' => $this->path . $model->{$this->uploadParam}->name,
                                'ACL'        => 'public-read'
                            ));

                            $result = [
                                'filelink' => $result['ObjectURL'],
                                'height' => intval($request->post('h')),
                                'width' => intval($request->post('w'))
                            ];

                            unlink($this->path . $model->{$this->uploadParam}->name);

                        } catch (\Exception $e) {
                            Yii::error($e);
                            $result = [
                                'error' => Yii::t('cropper', 'ERROR_CAN_NOT_UPLOAD_FILE')]
                            ;
                        }

                    } else {
                        $result = [
                            'error' => Yii::t('cropper', 'ERROR_CAN_NOT_UPLOAD_FILE')]
                        ;
                    }
                }
            }
            Yii::$app->response->format = Response::FORMAT_JSON;

            return $result;
        } else {
            throw new BadRequestHttpException(Yii::t('cropper', 'ONLY_POST_REQUEST'));
        }
    }
}
