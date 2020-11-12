/* eslint-disable class-methods-use-this */
const OSS = require('ali-oss');
const urlJoin = require('url-join');

module.exports = class OssAdapter {
  constructor({
    bucket,
    getFilename,
    publicUrl,
    ossOptions,
    uploadParams,
    folder = '',
  }) {
    if (!bucket) {
      throw new Error('OssAdapter requires a bucket name.');
    }
    this.client = new OSS({ ...ossOptions, bucket });
    this.bucket = bucket;
    this.folder = folder;
    this.ossOptions = ossOptions;
    if (getFilename) {
      this.getFilename = getFilename;
    }
    if (publicUrl) {
      this.publicUrl = publicUrl;
    }
    this.uploadParams = uploadParams || {};
  }

  async save({
    stream, filename, id, mimetype, encoding,
  }) {
    const fileData = {
      id,
      originalFilename: filename,
      filename: this.getFilename({ id, originalFilename: filename }),
      mimetype,
      encoding,
    };
    let { uploadParams } = this;
    if (typeof this.uploadParams === 'function') {
      uploadParams = this.uploadParams(fileData);
    }
    const data = await this.client.putStream(
      `${this.folder}/${fileData.filename}`,
      stream,
      {
        mime: fileData.mimetype,
        ...uploadParams,
      },
    );

    stream.destroy();

    return { ...fileData, _meta: data };
  }

  /**
   * Deletes the given file from ali-oss
   * @param file File field data
   * @param options A config object to be passed with each call to OSS.delete.
   *                Options `Bucket` and `Key` will be set by default.
   *                For available options refer to the [ali-oss delete API](https://github.com/ali-sdk/ali-oss#deletename-options).
   */
  async delete(file, options = {}) {
    if (file) {
      return this.client.delete(`${this.folder}/${file.filename}`, options);
    }
    throw new Error("Missing required argument 'file'.");
  }

  getFilename({ id, originalFilename }) {
    return `${id}-${originalFilename}`;
  }

  publicUrl({ filename }) {
    // This Url will only work if:
    // - the bucket is public OR
    // - the file is set to a canned ACL (ie, uploadParams: { ACL: 'public-read' }) OR
    // - credentials are passed along with the request
    return urlJoin(`https://${this.bucket}.${this.ossOptions.region}.aliyuncs.com`, this.folder, filename);
  }
};
