// src/environment/IslandMap.js
// Compact, optimized 3D Battle Royale island with low-poly buildings, roads, cover, and colliders

import * as THREE from 'three';

export class IslandMap {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // Static obstacle colliders { box: THREE.Box3, center: THREE.Vector3, radius: number }
    this.obstacleMeshes = []; // Meshes for bullet occlusion and line-of-sight raycasts
    this.lootSpawns = []; // Positions for weapon / ammo / medkit pickups
    this.botWaypoints = []; // Strategic patrol waypoints across the island

    // Pre-allocated collision query objects (Zero GC)
    this._queryBox = new THREE.Box3();
    this._queryMin = new THREE.Vector3();
    this._queryMax = new THREE.Vector3();

    this._initMaterials();
    this._buildTerrain();
    this._buildOcean();
    this._buildMilitaryBase();
    this._buildVillage();
    this._buildWarehouseDepot();
    this._buildRuins();
    this._buildTreesAndRocks();
    this._buildRoads();
  }

  _initMaterials() {
    this.mats = {
      grass: new THREE.MeshLambertMaterial({ color: 0x4a7c36 }),
      sand: new THREE.MeshLambertMaterial({ color: 0xd4b276 }),
      rock: new THREE.MeshLambertMaterial({ color: 0x696969 }),
      road: new THREE.MeshLambertMaterial({ color: 0x8a795d }),
      water: new THREE.MeshBasicMaterial({ color: 0x1f6690, transparent: true, opacity: 0.8 }),
      wallWhite: new THREE.MeshLambertMaterial({ color: 0xdfded9 }),
      wallBrick: new THREE.MeshLambertMaterial({ color: 0xa0522d }),
      roofTile: new THREE.MeshLambertMaterial({ color: 0x9c3e2d }),
      wood: new THREE.MeshLambertMaterial({ color: 0x6e4726 }),
      metalGrey: new THREE.MeshLambertMaterial({ color: 0x444b52 }),
      containerRed: new THREE.MeshLambertMaterial({ color: 0xa93226 }),
      containerBlue: new THREE.MeshLambertMaterial({ color: 0x2471a3 }),
      sandbag: new THREE.MeshLambertMaterial({ color: 0xc2a669 }),
      treeLeaves: new THREE.MeshLambertMaterial({ color: 0x2d6a36 }),
      treeTrunk: new THREE.MeshLambertMaterial({ color: 0x513829 })
    };
  }

  // Procedural heightmap for island: central hill, sandy shore, ocean falloff
  getTerrainHeight(x, z) {
    const dist = Math.sqrt(x * x + z * z);
    const islandRadius = 135;

    if (dist > islandRadius) {
      // Underwater shelf
      return -2.5;
    }

    // Natural island dome falloff
    const radialRatio = Math.max(0, 1 - dist / islandRadius);
    let h = Math.pow(radialRatio, 1.4) * 11.0;

    // Organic rolling hills and mounds
    h += Math.sin(x * 0.05) * Math.cos(z * 0.05) * 2.2;
    h += Math.sin(x * 0.12 + 1.2) * 1.0;

    // Beach plateau
    if (dist > islandRadius - 18) {
      h = Math.min(h, 0.4);
    }

    return Math.max(0.1, h);
  }

  _buildTerrain() {
    const segments = 64;
    const size = 300;
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const colors = [];
    const color = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = this.getTerrainHeight(vx, vz);
      pos.setY(i, vy);

      // Vertex color blending: sand at low elevation, grass higher up
      if (vy < 0.8) {
        color.setHex(0xd4b276); // Sand
      } else if (vy > 6.5) {
        color.setHex(0x3a632b); // Darker highland grass
      } else {
        color.setHex(0x4a7c36); // Lush green grass
      }
      colors.push(color.r, color.g, color.b);
    }

    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const terrainMat = new THREE.MeshLambertMaterial({
      vertexColors: true
    });

    const terrainMesh = new THREE.Mesh(geom, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.name = 'terrain';
    this.scene.add(terrainMesh);
  }

  _buildOcean() {
    const waterGeom = new THREE.PlaneGeometry(600, 600);
    waterGeom.rotateX(-Math.PI / 2);
    const waterMesh = new THREE.Mesh(waterGeom, this.mats.water);
    waterMesh.position.y = -0.3;
    waterMesh.name = 'ocean';
    this.scene.add(waterMesh);
  }

  _addObstacle(mesh) {
    this.scene.add(mesh);
    this.obstacleMeshes.push(mesh);
    return mesh;
  }

  getObstacleMeshes() {
    return this.obstacleMeshes;
  }

  _addBoxCollider(center, size, isPassable = false) {
    const box = new THREE.Box3(
      new THREE.Vector3(center.x - size.x / 2, center.y - size.y / 2, center.z - size.z / 2),
      new THREE.Vector3(center.x + size.x / 2, center.y + size.y / 2, center.z + size.z / 2)
    );
    const radius = Math.max(size.x, size.z) * 0.75;
    if (!isPassable) {
      this.colliders.push({
        box,
        center: new THREE.Vector3(center.x, center.y, center.z),
        radius
      });
    }
    return box;
  }

  // 1. Central Military Outpost
  _buildMilitaryBase() {
    const baseX = 0;
    const baseZ = 0;
    const baseY = this.getTerrainHeight(baseX, baseZ);

    this.botWaypoints.push(new THREE.Vector3(baseX, baseY, baseZ));

    // Helipad Concrete Pad
    const helipad = new THREE.Mesh(
      new THREE.CylinderGeometry(14, 14, 0.3, 16),
      this.mats.metalGrey
    );
    helipad.position.set(baseX, baseY + 0.15, baseZ);
    this._addObstacle(helipad);

    // Watchtower 2-story
    const towerX = baseX - 12;
    const towerZ = baseZ - 8;
    const towerY = this.getTerrainHeight(towerX, towerZ);

    // Tower 4 stilts
    const legGeom = new THREE.BoxGeometry(0.5, 7.5, 0.5);
    const legOffsets = [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]];
    legOffsets.forEach(([ox, oz]) => {
      const leg = new THREE.Mesh(legGeom, this.mats.metalGrey);
      leg.position.set(towerX + ox, towerY + 3.75, towerZ + oz);
      this._addObstacle(leg);
    });

    // Tower Platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.4, 6.5), this.mats.wood);
    platform.position.set(towerX, towerY + 7.5, towerZ);
    this._addObstacle(platform);
    this._addBoxCollider(new THREE.Vector3(towerX, towerY + 3.5, towerZ), new THREE.Vector3(6, 7, 6));

    // Tower Guard Rails & Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(7, 0.3, 7), this.mats.metalGrey);
    roof.position.set(towerX, towerY + 10.2, towerZ);
    this._addObstacle(roof);

    // High sniper loot atop watchtower
    this.lootSpawns.push({
      position: new THREE.Vector3(towerX, towerY + 8.0, towerZ),
      preferredType: 'brahmos_sr'
    });

    // Sandbag Bunkers
    this._createSandbagU(baseX + 6, baseZ + 8);
    this._createSandbagU(baseX - 8, baseZ + 10);

    // Military Supply Crates
    this._createCrate(baseX + 7, baseZ + 7, 1.2, 'kavach_ar');
    this._createCrate(baseX - 7, baseZ + 9, 1.0, 'ammo_ar');
    this._createCrate(baseX + 10, baseZ - 6, 1.2, 'medkit');
  }

  _createSandbagU(x, z) {
    const y = this.getTerrainHeight(x, z);
    const sandbagGeom = new THREE.BoxGeometry(2.4, 0.7, 0.7);
    const s1 = new THREE.Mesh(sandbagGeom, this.mats.sandbag);
    s1.position.set(x, y + 0.35, z);
    this._addObstacle(s1);
    this._addBoxCollider(s1.position, new THREE.Vector3(2.4, 0.8, 0.7));

    const s2 = new THREE.Mesh(sandbagGeom, this.mats.sandbag);
    s2.rotation.y = Math.PI / 2;
    s2.position.set(x - 1.0, y + 0.35, z + 1.0);
    this._addObstacle(s2);
    this._addBoxCollider(s2.position, new THREE.Vector3(0.7, 0.8, 2.4));
  }

  _createCrate(x, z, size = 1.0, loot = null) {
    const y = this.getTerrainHeight(x, z);
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      this.mats.wood
    );
    crate.position.set(x, y + size / 2, z);
    this._addObstacle(crate);
    this._addBoxCollider(crate.position, new THREE.Vector3(size, size, size));

    if (loot) {
      this.lootSpawns.push({
        position: new THREE.Vector3(x, y + size + 0.2, z),
        preferredType: loot
      });
    }
  }

  // 2. Coastal Village (4 Enterable cottages)
  _buildVillage() {
    const houses = [
      { x: -55, z: -35, rot: 0.2 },
      { x: -40, z: -55, rot: -0.4 },
      { x: -70, z: -50, rot: 0.6 },
      { x: -60, z: -75, rot: -0.1 }
    ];

    houses.forEach((h, idx) => {
      this._buildCottage(h.x, h.z, h.rot, idx);
      this.botWaypoints.push(
        new THREE.Vector3(h.x, this.getTerrainHeight(h.x, h.z), h.z)
      );
    });
  }

  _buildCottage(x, z, rot, idx) {
    const y = this.getTerrainHeight(x, z);
    const width = 8;
    const depth = 7;
    const height = 3.5;

    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rot;

    // Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth), this.mats.wood);
    floor.position.set(0, 0.1, 0);
    group.add(floor);

    // Back wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.3), this.mats.wallWhite);
    backWall.position.set(0, height / 2, -depth / 2);
    group.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, height, depth), this.mats.wallWhite);
    leftWall.position.set(-width / 2, height / 2, 0);
    group.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, height, depth), this.mats.wallWhite);
    rightWall.position.set(width / 2, height / 2, 0);
    group.add(rightWall);

    // Front wall with doorway (Left piece & Right piece, opening in center)
    const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(2.8, height, 0.3), this.mats.wallWhite);
    frontLeft.position.set(-2.6, height / 2, depth / 2);
    group.add(frontLeft);

    const frontRight = new THREE.Mesh(new THREE.BoxGeometry(2.8, height, 0.3), this.mats.wallWhite);
    frontRight.position.set(2.6, height / 2, depth / 2);
    group.add(frontRight);

    // Slanted Roof (pyramid/pitched)
    const roofGeom = new THREE.ConeGeometry(6.2, 2.2, 4);
    roofGeom.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeom, this.mats.roofTile);
    roof.position.set(0, height + 1.1, 0);
    group.add(roof);

    this._addObstacle(group);

    // Solid wall colliders
    this._addBoxCollider(new THREE.Vector3(x, y + height / 2, z), new THREE.Vector3(width * 0.9, height, depth * 0.9));

    // Interior Loot
    const lootList = ['garuda_smg', 'trishul_12', 'medkit', 'kavach_ar'];
    this.lootSpawns.push({
      position: new THREE.Vector3(x, y + 0.6, z),
      preferredType: lootList[idx % lootList.length]
    });
  }

  // 3. Shipping Warehouse Depot
  _buildWarehouseDepot() {
    const wx = 55;
    const wz = 45;
    const wy = this.getTerrainHeight(wx, wz);

    this.botWaypoints.push(new THREE.Vector3(wx, wy, wz));

    // Large Depot Building
    const width = 16;
    const depth = 22;
    const height = 6.0;

    const warehouse = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      this.mats.metalGrey
    );
    warehouse.position.set(wx, wy + height / 2, wz);
    this._addObstacle(warehouse);
    this._addBoxCollider(warehouse.position, new THREE.Vector3(width, height, depth));

    // Stacks of Shipping Containers outside
    const containers = [
      { x: wx + 14, z: wz - 5, rot: 0, color: this.mats.containerRed },
      { x: wx + 14, z: wz + 4, rot: 0, color: this.mats.containerBlue },
      { x: wx - 14, z: wz - 2, rot: Math.PI / 2, color: this.mats.containerRed },
      { x: wx - 14, z: wz + 6, rot: Math.PI / 2, color: this.mats.containerBlue }
    ];

    containers.forEach((c, idx) => {
      const cy = this.getTerrainHeight(c.x, c.z);
      const cMesh = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.8, 6.5), c.color);
      cMesh.rotation.y = c.rot;
      cMesh.position.set(c.x, cy + 1.4, c.z);
      this._addObstacle(cMesh);
      this._addBoxCollider(cMesh.position, new THREE.Vector3(3.2, 3.0, 6.7));

      this.lootSpawns.push({
        position: new THREE.Vector3(c.x, cy + 3.1, c.z),
        preferredType: idx % 2 === 0 ? 'kavach_ar' : 'garuda_smg'
      });
    });
  }

  // 4. Ancient Ruins / Hillside Vantage Point
  _buildRuins() {
    const rx = -35;
    const rz = 55;
    const ry = this.getTerrainHeight(rx, rz);

    this.botWaypoints.push(new THREE.Vector3(rx, ry, rz));

    // Weathered Stone Pillars
    const pillarPositions = [
      [-6, -6], [0, -6], [6, -6],
      [-6, 6], [0, 6], [6, 6]
    ];

    pillarPositions.forEach(([ox, oz]) => {
      const px = rx + ox;
      const pz = rz + oz;
      const py = this.getTerrainHeight(px, pz);
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.8, 4.5, 7),
        this.mats.rock
      );
      pillar.position.set(px, py + 2.25, pz);
      this._addObstacle(pillar);
      this._addBoxCollider(pillar.position, new THREE.Vector3(1.5, 4.5, 1.5));
    });

    // Central ancient altar with sniper loot
    this._createCrate(rx, rz, 1.4, 'brahmos_sr');
  }

  // 5. Trees, Rocks, and Cover Objects
  _buildTreesAndRocks() {
    // Shared geometries for performance
    const trunkGeom = new THREE.CylinderGeometry(0.2, 0.35, 3.2, 5);
    const leavesGeom = new THREE.ConeGeometry(2.0, 4.5, 5);
    const rockGeom = new THREE.DodecahedronGeometry(1.2, 0);

    const rng = (seed) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // Plant 75 low-poly trees across the island
    for (let i = 0; i < 75; i++) {
      const angle = rng(i * 12.3) * Math.PI * 2;
      const dist = 18 + rng(i * 45.7) * 95;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Skip clearing near center outpost
      if (Math.hypot(x, z) < 18) continue;

      const y = this.getTerrainHeight(x, z);
      if (y < 0.6) continue; // Don't place in deep water

      const tree = new THREE.Group();
      tree.position.set(x, y, z);

      const trunk = new THREE.Mesh(trunkGeom, this.mats.treeTrunk);
      trunk.position.y = 1.6;
      tree.add(trunk);

      const leaves = new THREE.Mesh(leavesGeom, this.mats.treeLeaves);
      leaves.position.y = 4.2;
      tree.add(leaves);

      const scale = 0.8 + rng(i * 3.1) * 0.5;
      tree.scale.set(scale, scale, scale);

      this._addObstacle(tree);
      this._addBoxCollider(new THREE.Vector3(x, y + 1.5, z), new THREE.Vector3(0.8, 3.5, 0.8));
    }

    // 40 Cover Rocks
    for (let i = 0; i < 40; i++) {
      const angle = rng(i * 88.4 + 10) * Math.PI * 2;
      const dist = 22 + rng(i * 92.1) * 90;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const y = this.getTerrainHeight(x, z);
      if (y < 0.5) continue;

      const rock = new THREE.Mesh(rockGeom, this.mats.rock);
      const scale = 0.8 + rng(i * 7.7) * 1.2;
      rock.scale.set(scale * 1.3, scale * 0.9, scale);
      rock.rotation.set(rng(i), rng(i * 2), rng(i * 3));
      rock.position.set(x, y + scale * 0.5, z);

      this._addObstacle(rock);
      this._addBoxCollider(rock.position, new THREE.Vector3(scale * 1.6, scale * 1.2, scale * 1.6));
    }
  }

  // 6. Roads & Paths
  _buildRoads() {
    // Dirt road connecting village to outpost to depot
    const points = [
      new THREE.Vector3(-55, 0, -50),
      new THREE.Vector3(-25, 0, -20),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(30, 0, 25),
      new THREE.Vector3(55, 0, 45)
    ];

    points.forEach(p => {
      p.y = this.getTerrainHeight(p.x, p.z) + 0.05;
    });

    const curve = new THREE.CatmullRomCurve3(points);
    const curvePoints = curve.getPoints(30);

    const roadGeom = new THREE.BufferGeometry();
    const verts = [];
    const width = 3.2;

    for (let i = 0; i < curvePoints.length - 1; i++) {
      const p1 = curvePoints[i];
      const p2 = curvePoints[i + 1];
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      const normal = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2);

      p1.y = this.getTerrainHeight(p1.x, p1.z) + 0.06;
      p2.y = this.getTerrainHeight(p2.x, p2.z) + 0.06;

      // Quad
      verts.push(p1.x - normal.x, p1.y, p1.z - normal.z);
      verts.push(p1.x + normal.x, p1.y, p1.z + normal.z);
      verts.push(p2.x - normal.x, p2.y, p2.z - normal.z);

      verts.push(p1.x + normal.x, p1.y, p1.z + normal.z);
      verts.push(p2.x + normal.x, p2.y, p2.z + normal.z);
      verts.push(p2.x - normal.x, p2.y, p2.z - normal.z);
    }

    roadGeom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    roadGeom.computeVertexNormals();
    const roadMesh = new THREE.Mesh(roadGeom, this.mats.road);
    this.scene.add(roadMesh);
  }

  // High-performance collision check with Manhattan distance cull (Zero GC)
  checkCollision(position, radius = 0.4) {
    this._queryMin.set(position.x - radius, position.y + 0.2, position.z - radius);
    this._queryMax.set(position.x + radius, position.y + 1.8, position.z + radius);
    this._queryBox.min = this._queryMin;
    this._queryBox.max = this._queryMax;

    const px = position.x;
    const pz = position.z;

    for (let i = 0; i < this.colliders.length; i++) {
      const col = this.colliders[i];
      if (
        Math.abs(col.center.x - px) > (col.radius + radius) ||
        Math.abs(col.center.z - pz) > (col.radius + radius)
      ) {
        continue;
      }
      if (col.box.intersectsBox(this._queryBox)) {
        return true;
      }
    }
    return false;
  }
}
