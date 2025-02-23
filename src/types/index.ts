export type AccessorEvent<AC={}> = {
    init: (actualPath:string, ...args:any[])=>AC;
    
    /**
     * 신규 파일 생성 시 호출
     */
    create: (ac:AC, actualPath:string, ...args:any[])=>void;
    
    /**
     * 파일이 존재한다면 create() 대신 호출됨
     */
    load: (ac:AC, actualPath:string, ...args:any[])=>void;

    store: (ac:AC, actualPath:string, ...args:any[])=>void;

    exists: (ac:AC, actualPath:string, ...args:any[])=>boolean;

    destroy: (ac:AC, actualPath:string, ...args:any[])=>void;

    copy? : (prevAC:AC, nextAC:AC)=>void;
    /**
     * Optional
     * 
     * 호환가능한 Accessor인 경우, copy 작업 시 호출된다.
     * 구현하지 않은 경우, copy를 통해 move 작업을 수행한다.
     */
    move? : (prevAC:AC, nextAC:AC)=>void;
    /**
     * Optional
     * 
     * 두 Accessor를 비교하여 상호간 move, copy 연산이 가능한지 확인한다.
     * 비교 대상은 customId가 같은 경우에 한정한다.
     * 구현하지 않는 경우, customId만 일치하면 move, copy 연산이 가능하다고 판단한다.
     */
    isCompatible? : (one:AC, other:AC)=>boolean;
}