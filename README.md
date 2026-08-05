# Pendragon

Community implementation of Chaosium's Pendragon for Foundry VTT

Licenses All the code on this repository is licensed under the MIT License (see License.txt) The implementation was built off the Boilerplate system by Asacolips and is licensed under the MIT License (see License.txt) Foundry VTT support is covered by Limited License Agreement for Module Development. This project uses some assets from Games Icons, our thanks to its authors (https://game-icons.net/)

This system uses trademarks and/or copyrights owned by Chaosium Inc/Moon Design Publications LLC, which are used under Chaosium Inc's Fan Material Policy. We are expressly prohibited from charging you to use or access this content. This system is not published, endorsed, or specifically approved by Chaosium Inc. For more information about Chaosium Inc's products, please visit www.chaosium.com.

Permission is given for users to make limited derivative use of this publication for personal use on the Foundry VTT platform. No rights for any commercial use are granted. No part of this publication may be reproduced or distributed for use outside of the Foundry VTT platform. All rights are reserved with Chaosium Inc. Pendragon © copyright 1981–2024 Chaosium Inc. All rights reserved.

Please note that the base system comes with instructions but no "items" (i.e. skills, traits, passions etc). Some of the basic items and some examples do come in a companion module https://github.com/Genii-Locorum/p6ebase

## Compendium Packs

Compendium packs are stored in this repo as editable **YAML source** under `packs/_source/<pack>/`.
The compiled LevelDB databases in `packs/<pack>/` are **not** committed (git-ignored) and must be built from source.

### Building packs for a release (i.e. create DB files from YAML files)

Before packaging/zipping the system for a release, compile the source into the LevelDB packs Foundry loads:

Open a command prompt and change the directory to your Foundry Pendragon folder. It will be something like

```
cd /d D:\FoundryVTT\Data\systems\Pendragon

```

If you haven't already installed npm then run the following in command prompt

```
npm install       # first time only
```

To build the packs from the JSON/YAML files run the following in command prompt

```
npm run build:db  # compile packs/_source/**/*.yml -> packs/<pack>/
```

This regenerates `packs/instructions`, `packs/macro`, and `packs/scenes` (the paths declared in `system.json`).

To build a single pack:

```
npm run build:db -- macro
```

Because the compiled `packs/<pack>/` databases are git-ignored, they will not come from a git checkout — they must be generated at release time and included in the distributed archive.

### Editing pack contents (i.e. create YAML files from DB files)

Edit the YAML files in `packs/_source/` directly, or edit inside Foundry and extract the changes back to source:

```
npm run build:json          # extract all packs -> packs/_source/
npm run build:json -- macro # extract a single pack
```

Commit the resulting YAML under `packs/_source/`; never commit the compiled `packs/<pack>/` databases.

### Format the JS files to consistent format

To ensure the spacing, row lengths etc are consistent run the fmt formatting before preparing the commit to ensure consistency

```
npm run fmt
```
