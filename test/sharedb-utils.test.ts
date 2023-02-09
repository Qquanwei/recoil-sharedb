import { diffToPath } from '../src/sharedb-utils';


describe('diffToPath', () => {
    it ('should be ok', () => {
        expect(diffToPath).toBeInstanceOf(Function);
    });

    describe('Array', () => {
        it ('case1', () => {
            expect(diffToPath([1], [1, 2])).toEqual([
                [1]
            ]);
        });

        it ('case2', () => {
            expect(diffToPath([1], [1, 2, 3])).toEqual([
                [1],
                [2]
            ]);
        });

        it ('case3', () => {
            expect(diffToPath([2], [1, 2])).toEqual([
                [0],
                [1]
            ]);
        });

        it ('case4 sort', () => {
            expect(diffToPath([2, 1], [1, 2])).toEqual([
                [0],
                [1]
            ]);
        });

        it ('嵌套 case4 sort', () => {
            expect(diffToPath({ key: [2, 1]}, { key: [1, 2]})).toEqual([
                ['key', 0],
                ['key', 1]
            ]);
        });
    });

    describe('Object', () => {
        it ('case1', () => {
            expect(diffToPath({ kfoo: 'bar' }, { kbar: 'foo'})).toEqual([
                ['kbar'],
                ['kfoo']
            ]);
        })
    })
})
