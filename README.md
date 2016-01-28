# progressive-vulcans

Builds a multi-page app with shared dependencies.


#### definition
An YAML file containing the incremental target files and the lazy elements that needs to be vulcanized into them.
Sample file is provided in `sample` folder. This file should be placed in the root directory.

### Usage
 `pvn <options>`

- `-h`, `--help`                       Print usage.
- `-b`, `--bowerdir string`            Bower components directory. Defaults to 'bower_components'
- `-r`, `--root string`                Root directory against which URLs in inputs are resolved. If not specified, then the current working directory is used.
- `-d`, `--destdir string`             Destination for vulcanized application. Defaults to 'dist/'.
- `-f`, `--definition string`          YAML file containing the inputs for vulcanization process. Defaults to 'pvn.yml'.
- `-e`, `--elementsdir string`         Directory relative to root where elements to be vulcanized are stored. Defaults to 'app/elements/'.
- `-w`, `--workdir string`             Temporary directory for holding in-process files. DANGER: this directory will be deleted upon tool success. Defaults to 'tmp/'
